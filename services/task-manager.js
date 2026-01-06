class TaskManager {
  constructor(notionService, slackService) {
    this.notionService = notionService;
    this.slackService = slackService;
    this.activeTasks = new Map(); // taskId -> { messageTs, channel, title, lastDueDate }
    this.maxActiveTasks = 3;
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
        
        // Filter for overdue/due today tasks that aren't completed
        const urgentNewTasks = newTasks.filter(task => {
          const today = new Date().toISOString().split('T')[0];
          return task.dueDate && task.dueDate <= today && !task.completed;
        });
        
        if (urgentNewTasks.length > 0) {
          console.log(`⚡ ${urgentNewTasks.length} new urgent tasks found - posting immediately!`);
          
          for (const task of urgentNewTasks) {
            await this.postSingleTaskIfSpace(task);
          }
        } else {
          console.log('📝 New tasks found but none are urgent (due today or overdue)');
        }
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
      
      console.log(`📤 Posting new task: "${task.title}"`);
      
      const messageInfo = await this.slackService.postTaskMessage(task);
      
      this.activeTasks.set(task.id, {
        messageTs: messageInfo.messageTs,
        channel: messageInfo.channel,
        title: task.title,
        lastDueDate: task.dueDate
      });
      
      return true;
      
    } catch (error) {
      console.error(`Error posting single task "${task.title}":`, error);
      return false;
    }
  }
  /**
   * Post today's overdue and due-today tasks to Slack (up to 3)
   * Prioritizes most overdue tasks first
   */
  async postTodaysTasks() {
    try {
      console.log('Fetching overdue and today\'s tasks from Notion...');
      
      // Get all overdue and today's tasks (sorted by most overdue first)
      const overdueTasks = await this.notionService.getOverdueTasks();
      
      if (overdueTasks.length === 0) {
        console.log('No overdue or due-today tasks found');
        return;
      }

      console.log(`Found ${overdueTasks.length} overdue/due-today tasks`);

      // Filter out tasks that are already posted
      const newTasks = overdueTasks.filter(task => !this.activeTasks.has(task.id));
      
      // Calculate how many new tasks we can post
      const currentActiveCount = this.activeTasks.size;
      const availableSlots = this.maxActiveTasks - currentActiveCount;
      
      if (availableSlots <= 0) {
        console.log('Maximum number of active tasks reached (3). Complete some tasks first.');
        return;
      }

      // Post up to the available slots (most overdue first)
      const tasksToPost = newTasks.slice(0, availableSlots);
      
      if (tasksToPost.length === 0) {
        console.log('No new tasks to post (all overdue/due-today tasks are already active)');
        return;
      }

      console.log(`Posting ${tasksToPost.length} new tasks to Slack (most overdue first)...`);

      // Post each task
      for (const task of tasksToPost) {
        try {
          const messageInfo = await this.slackService.postTaskMessage(task);
          
          // Store the message info for later deletion
          this.activeTasks.set(task.id, {
            messageTs: messageInfo.messageTs,
            channel: messageInfo.channel,
            title: task.title,
            lastDueDate: task.dueDate
          });
          
        } catch (error) {
          console.error(`Failed to post task ${task.title}:`, error);
        }
      }

      console.log(`Successfully posted ${tasksToPost.length} tasks. Active tasks: ${this.activeTasks.size}`);
      
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
}

module.exports = { TaskManager };