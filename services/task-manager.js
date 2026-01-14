class TaskManager {
  constructor(notionService, slackService) {
    this.notionService = notionService;
    this.slackService = slackService;
    this.activeTasks = new Map(); // taskId -> { messageTs, channel, title, lastDueDate }
    this.maxActiveTasks = 9; // 3 tasks per person (ROB, SAM, ANNA)
    this.maxTasksPerPerson = 3; // Maximum tasks per person
    this.knownTaskIds = new Set(); // Track all tasks we've seen before
    this.lastCheckTime = new Date();
  }

  /**
   * Initialize known tasks (run once on startup)
   */
  async initializeKnownTasks() {
    try {
      console.log('🔄 Initializing known tasks...');
      const allTasks = await this.notionService.getAllTasks(); // We'll create this method
      
      allTasks.forEach(task => {
        this.knownTaskIds.add(task.id);
      });
      
      console.log(`📋 Initialized with ${this.knownTaskIds.size} known tasks`);
      
    } catch (error) {
      console.error('Error initializing known tasks:', error);
    }
  }

  /**
   * Check for tasks that had their due dates updated in Notion
   * Remove old messages and repost with updated dates if still urgent
   */
  async checkForUpdatedTasks() {
    try {
      if (this.activeTasks.size === 0) {
        return; // No active tasks to check
      }

      console.log('🔍 Checking for task date updates in Notion...');
      
      const activeTaskIds = Array.from(this.activeTasks.keys());
      const tasksToRefresh = [];
      
      for (const taskId of activeTaskIds) {
        try {
          // Get current task data from Notion
          const currentTask = await this.notionService.getTaskById(taskId);
          const storedTaskInfo = this.activeTasks.get(taskId);
          
          if (!currentTask) {
            // Task was deleted in Notion
            console.log(`📋 Task "${storedTaskInfo.title}" was deleted in Notion - removing from Slack`);
            await this.slackService.deleteMessage(storedTaskInfo.channel, storedTaskInfo.messageTs);
            tasksToRefresh.push({ action: 'remove', taskId });
            continue;
          }
          
          // Check if due date changed
          if (currentTask.dueDate !== storedTaskInfo.lastDueDate) {
            console.log(`📅 Task "${currentTask.title}" due date changed from ${storedTaskInfo.lastDueDate} to ${currentTask.dueDate}`);
            
            // Delete old message
            await this.slackService.deleteMessage(storedTaskInfo.channel, storedTaskInfo.messageTs);
            
            // Check if task is still urgent (due today or overdue)
            const today = new Date().toISOString().split('T')[0];
            const isStillUrgent = currentTask.dueDate && currentTask.dueDate <= today && !currentTask.completed;
            
            if (isStillUrgent) {
              // Repost with updated date
              console.log(`📤 Reposting task "${currentTask.title}" with updated date`);
              const messageInfo = await this.slackService.postTaskMessage(currentTask);
              
              tasksToRefresh.push({ 
                action: 'update', 
                taskId, 
                messageInfo, 
                task: currentTask 
              });
            } else {
              // Task is no longer urgent, just remove it
              console.log(`📋 Task "${currentTask.title}" is no longer urgent - removing from Slack`);
              tasksToRefresh.push({ action: 'remove', taskId });
            }
          }
          
        } catch (error) {
          console.error(`Error checking task ${taskId} for updates:`, error);
        }
      }
      
      // Apply all changes
      tasksToRefresh.forEach(({ action, taskId, messageInfo, task }) => {
        if (action === 'remove') {
          this.activeTasks.delete(taskId);
        } else if (action === 'update') {
          this.activeTasks.set(taskId, {
            messageTs: messageInfo.messageTs,
            channel: messageInfo.channel,
            title: task.title,
            lastDueDate: task.dueDate
          });
        }
      });
      
      if (tasksToRefresh.length > 0) {
        console.log(`🔄 Refreshed ${tasksToRefresh.length} task(s) due to date changes`);
        
        // Try to fill any empty slots with new tasks
        await this.postTodaysTasks();
      }
      
    } catch (error) {
      console.error('Error checking for updated tasks:', error);
    }
  }
  async checkForCompletedTasks() {
    try {
      if (this.activeTasks.size === 0) {
        return; // No active tasks to check
      }

      console.log('🔍 Checking if any active tasks were completed in Notion...');
      
      // Get current status of all active tasks from Notion
      const activeTaskIds = Array.from(this.activeTasks.keys());
      const tasksToRemove = [];
      
      for (const taskId of activeTaskIds) {
        try {
          // Check if this task is now completed in Notion
          const isCompleted = await this.notionService.isTaskCompleted(taskId);
          
          if (isCompleted) {
            const taskInfo = this.activeTasks.get(taskId);
            console.log(`📋 Task "${taskInfo.title}" was completed in Notion - removing from Slack`);
            
            // Delete the Slack message
            await this.slackService.deleteMessage(taskInfo.channel, taskInfo.messageTs);
            
            // Remove from active tasks
            tasksToRemove.push(taskId);
          }
          
        } catch (error) {
          console.error(`Error checking task ${taskId}:`, error);
        }
      }
      
      // Remove completed tasks from active list
      tasksToRemove.forEach(taskId => {
        this.activeTasks.delete(taskId);
      });
      
      if (tasksToRemove.length > 0) {
        console.log(`🧹 Removed ${tasksToRemove.length} completed task(s) from Slack`);
        
        // Try to post new tasks to fill the available slots
        await this.postTodaysTasks();
      }
      
    } catch (error) {
      console.error('Error checking for completed tasks:', error);
    }
  }
  async checkForNewTasks() {
    try {
      console.log('🔍 Checking for new tasks...');
      
      const allCurrentTasks = await this.notionService.getAllTasks();
      const newTasks = [];
      
      // Find tasks we haven't seen before
      allCurrentTasks.forEach(task => {
        if (!this.knownTaskIds.has(task.id)) {
          newTasks.push(task);
          this.knownTaskIds.add(task.id); // Remember this task
        }
      });
      
      if (newTasks.length > 0) {
        console.log(`🆕 Found ${newTasks.length} new tasks!`);
        
        // Filter for urgent tasks (overdue/due today) that aren't completed
        const today = new Date().toISOString().split('T')[0];
        const urgentNewTasks = newTasks.filter(task => {
          return task.dueDate && task.dueDate <= today && !task.completed;
        });
        
        // Filter for upcoming tasks (next 7 days) that aren't completed
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];
        
        const upcomingNewTasks = newTasks.filter(task => {
          return task.dueDate && task.dueDate > today && task.dueDate <= sevenDaysStr && !task.completed;
        });
        
        if (urgentNewTasks.length > 0) {
          console.log(`⚡ ${urgentNewTasks.length} new urgent tasks found - posting immediately!`);
          
          for (const task of urgentNewTasks) {
            task.priority = 'urgent';
            await this.postSingleTaskIfSpace(task);
          }
        }
        
        // If we still have space, post upcoming tasks
        const availableSlots = this.maxActiveTasks - this.activeTasks.size;
        if (availableSlots > 0 && upcomingNewTasks.length > 0) {
          console.log(`🟢 ${upcomingNewTasks.length} new upcoming tasks found - posting to fill remaining slots!`);
          
          for (const task of upcomingNewTasks.slice(0, availableSlots)) {
            task.priority = 'upcoming';
            await this.postSingleTaskIfSpace(task);
          }
        }
        
        if (urgentNewTasks.length === 0 && upcomingNewTasks.length === 0) {
          console.log('📝 New tasks found but none are urgent or upcoming (within next 7 days)');
        }
      }
      
      // Also check if we have available slots and can post existing tasks
      const availableSlots = this.maxActiveTasks - this.activeTasks.size;
      if (availableSlots > 0) {
        console.log(`📋 ${availableSlots} slots available - checking for existing tasks to post`);
        await this.postTodaysTasks();
      }
      
    } catch (error) {
      console.error('Error checking for new tasks:', error);
    }
  }

  /**
   * Post a single task if there's space
   */
  async postSingleTaskIfSpace(task) {
    try {
      // Check if we have space and task isn't already active
      if (this.activeTasks.size >= this.maxActiveTasks) {
        console.log(`⏸️ Cannot post "${task.title}" - max tasks reached (${this.maxActiveTasks})`);
        return false;
      }
      
      if (this.activeTasks.has(task.id)) {
        console.log(`⏸️ Task "${task.title}" is already active`);
        return false;
      }
      
      console.log(`📤 Posting new ${task.priority || 'urgent'} task: "${task.title}"`);
      
      const messageInfo = await this.slackService.postTaskMessage(task);
      
      this.activeTasks.set(task.id, {
        messageTs: messageInfo.messageTs,
        channel: messageInfo.channel,
        title: task.title,
        lastDueDate: task.dueDate,
        priority: task.priority || 'urgent',
        assignedTo: task.assignedTo?.name || 'UNASSIGNED'
      });
      
      return true;
      
    } catch (error) {
      console.error(`Error posting single task "${task.title}":`, error);
      return false;
    }
  }
  /**
   * Post today's overdue and due-today tasks to Slack (up to 9 total: 3 per person)
   * If space available, also post upcoming tasks (next 7 days) with green emojis
   * Prioritizes most overdue tasks first, then upcoming tasks
   * Organizes by person: ROB, SAM, ANNA (3 tasks each)
   */
  async postTodaysTasks() {
    try {
      console.log('Fetching overdue, today\'s, and upcoming tasks from Notion...');
      
      // Get urgent tasks (overdue and due today)
      const urgentTasks = await this.notionService.getOverdueTasks();
      
      // Get upcoming tasks (next 3 days) if we have space
      const upcomingTasks = await this.notionService.getUpcomingTasks();
      
      console.log(`Found ${urgentTasks.length} urgent tasks and ${upcomingTasks.length} upcoming tasks`);

      // Combine all tasks
      const allTasks = [...urgentTasks, ...upcomingTasks];
      
      // Filter out tasks that are already posted
      const newTasks = allTasks.filter(task => !this.activeTasks.has(task.id));
      
      // Group tasks by person
      const tasksByPerson = {
        'ROB': [],
        'SAM': [],
        'ANNA': [],
        'UNASSIGNED': []
      };
      
      newTasks.forEach(task => {
        const personName = task.assignedTo?.name || 'UNASSIGNED';
        if (tasksByPerson[personName]) {
          tasksByPerson[personName].push(task);
        } else {
          tasksByPerson['UNASSIGNED'].push(task);
        }
      });
      
      // Count current active tasks per person
      const activeTasksByPerson = {
        'ROB': 0,
        'SAM': 0,
        'ANNA': 0,
        'UNASSIGNED': 0
      };
      
      this.activeTasks.forEach((info, taskId) => {
        const personName = info.assignedTo || 'UNASSIGNED';
        if (activeTasksByPerson[personName] !== undefined) {
          activeTasksByPerson[personName]++;
        }
      });
      
      console.log('Current active tasks per person:', activeTasksByPerson);
      
      // Post up to 3 tasks per person
      const tasksToPost = [];
      
      ['ROB', 'SAM', 'ANNA', 'UNASSIGNED'].forEach(person => {
        const availableSlots = this.maxTasksPerPerson - activeTasksByPerson[person];
        if (availableSlots > 0 && tasksByPerson[person].length > 0) {
          // Sort by priority (urgent first) then by due date
          const sortedTasks = tasksByPerson[person].sort((a, b) => {
            if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
            if (a.priority !== 'urgent' && b.priority === 'urgent') return 1;
            return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
          });
          
          const tasksForPerson = sortedTasks.slice(0, availableSlots);
          tasksToPost.push(...tasksForPerson);
          
          console.log(`${person}: Adding ${tasksForPerson.length} tasks (${availableSlots} slots available)`);
        }
      });
      
      if (tasksToPost.length === 0) {
        console.log('No new tasks to post (all slots filled or no tasks available)');
        return;
      }

      console.log(`Posting ${tasksToPost.length} tasks to Slack...`);

      // Post each task
      for (const task of tasksToPost) {
        try {
          const messageInfo = await this.slackService.postTaskMessage(task);
          
          // Store the message info for later deletion
          this.activeTasks.set(task.id, {
            messageTs: messageInfo.messageTs,
            channel: messageInfo.channel,
            title: task.title,
            lastDueDate: task.dueDate,
            priority: task.priority || 'urgent',
            assignedTo: task.assignedTo?.name || 'UNASSIGNED'
          });
          
        } catch (error) {
          console.error(`Failed to post task ${task.title}:`, error);
        }
      }

      // Count tasks posted per person
      const postedByPerson = {};
      tasksToPost.forEach(task => {
        const person = task.assignedTo?.name || 'UNASSIGNED';
        postedByPerson[person] = (postedByPerson[person] || 0) + 1;
      });
      
      console.log(`Successfully posted tasks:`, postedByPerson);
      console.log(`Total active tasks: ${this.activeTasks.size}/${this.maxActiveTasks}`);
      
    } catch (error) {
      console.error('Error in postTodaysTasks:', error);
      throw error;
    }
  }

  /**
   * Handle task completion - remove from active tasks and post next task if available
   */
  async handleTaskCompletion(taskId) {
    try {
      // Remove from active tasks
      const taskInfo = this.activeTasks.get(taskId);
      if (taskInfo) {
        this.activeTasks.delete(taskId);
        console.log(`Removed task "${taskInfo.title}" from active tasks`);
      }

      // Try to post the next available task
      await this.postTodaysTasks();
      
    } catch (error) {
      console.error('Error handling task completion:', error);
      throw error;
    }
  }

  /**
   * Get current active tasks info
   */
  getActiveTasks() {
    return Array.from(this.activeTasks.entries()).map(([taskId, info]) => ({
      taskId,
      title: info.title,
      messageTs: info.messageTs
    }));
  }

  /**
   * Clear all active tasks (useful for debugging)
   */
  clearActiveTasks() {
    this.activeTasks.clear();
    console.log('Cleared all active tasks');
  }

  /**
   * Clean up stale messages (run daily at 6 AM)
   * Removes messages for tasks that are no longer urgent or completed
   */
  async cleanupStaleMessages() {
    try {
      console.log('🧹 Running daily cleanup of stale messages...');
      
      if (this.activeTasks.size === 0) {
        console.log('No active tasks to clean up');
        return;
      }

      const activeTaskIds = Array.from(this.activeTasks.keys());
      const tasksToRemove = [];
      const today = new Date().toISOString().split('T')[0];
      
      for (const taskId of activeTaskIds) {
        try {
          const taskInfo = this.activeTasks.get(taskId);
          const currentTask = await this.notionService.getTaskById(taskId);
          
          let shouldRemove = false;
          let reason = '';
          
          if (!currentTask) {
            // Task was deleted in Notion
            shouldRemove = true;
            reason = 'deleted from Notion';
          } else if (currentTask.completed) {
            // Task is completed
            shouldRemove = true;
            reason = 'completed';
          } else if (currentTask.dueDate && currentTask.dueDate > today) {
            // Task is no longer due today or overdue
            shouldRemove = true;
            reason = 'no longer urgent (due date moved to future)';
          } else if (!currentTask.dueDate) {
            // Task has no due date
            shouldRemove = true;
            reason = 'no due date';
          }
          
          if (shouldRemove) {
            console.log(`🗑️ Removing stale task "${taskInfo.title}" - ${reason}`);
            
            // Delete the Slack message
            await this.slackService.deleteMessage(taskInfo.channel, taskInfo.messageTs);
            tasksToRemove.push(taskId);
          }
          
        } catch (error) {
          console.error(`Error checking task ${taskId} during cleanup:`, error);
          // If we can't check the task, remove it to be safe
          const taskInfo = this.activeTasks.get(taskId);
          console.log(`🗑️ Removing problematic task "${taskInfo.title}" due to error`);
          await this.slackService.deleteMessage(taskInfo.channel, taskInfo.messageTs);
          tasksToRemove.push(taskId);
        }
      }
      
      // Remove stale tasks from active list
      tasksToRemove.forEach(taskId => {
        this.activeTasks.delete(taskId);
      });
      
      if (tasksToRemove.length > 0) {
        console.log(`🧹 Cleaned up ${tasksToRemove.length} stale message(s)`);
        
        // Post fresh tasks to fill available slots
        await this.postTodaysTasks();
      } else {
        console.log('✅ No stale messages found - all active tasks are current');
      }
      
    } catch (error) {
      console.error('Error during daily cleanup:', error);
    }
  }
}

module.exports = { TaskManager };