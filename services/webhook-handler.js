const express = require('express');
const crypto = require('crypto');

class NotionWebhookHandler {
  constructor(taskManager, notionSecret) {
    this.taskManager = taskManager;
    this.notionSecret = notionSecret;
  }

  /**
   * Verify webhook signature from Notion
   */
  verifySignature(body, signature) {
    const expectedSignature = crypto
      .createHmac('sha256', this.notionSecret)
      .update(body, 'utf8')
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Handle incoming webhook from Notion
   */
  async handleWebhook(req, res) {
    try {
      const signature = req.headers['notion-signature'];
      const body = JSON.stringify(req.body);
      
      // Verify the webhook is from Notion
      if (!this.verifySignature(body, signature)) {
        return res.status(401).send('Invalid signature');
      }

      const event = req.body;
      console.log('📨 Notion webhook received:', event.type);

      switch (event.type) {
        case 'page.created':
          await this.handleTaskCreated(event.data);
          break;
        case 'page.updated':
          await this.handleTaskUpdated(event.data);
          break;
        case 'page.deleted':
          await this.handleTaskDeleted(event.data);
          break;
      }

      res.status(200).send('OK');
      
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.status(500).send('Error');
    }
  }

  async handleTaskCreated(pageData) {
    console.log('🆕 New task created:', pageData.id);
    // Check if it's urgent and post immediately
    const task = await this.taskManager.notionService.getTaskById(pageData.id);
    if (task && this.isUrgentTask(task)) {
      await this.taskManager.postSingleTaskIfSpace(task);
    }
  }

  async handleTaskUpdated(pageData) {
    console.log('📝 Task updated:', pageData.id);
    
    // Check if this task is currently active in Slack
    if (this.taskManager.activeTasks.has(pageData.id)) {
      const task = await this.taskManager.notionService.getTaskById(pageData.id);
      
      if (!task || task.completed) {
        // Task was completed or deleted - remove from Slack
        const taskInfo = this.taskManager.activeTasks.get(pageData.id);
        await this.taskManager.slackService.deleteMessage(taskInfo.channel, taskInfo.messageTs);
        this.taskManager.activeTasks.delete(pageData.id);
        
        // Post next task if available
        await this.taskManager.postTodaysTasks();
      } else {
        // Check if due date changed - refresh message if needed
        const storedInfo = this.taskManager.activeTasks.get(pageData.id);
        if (task.dueDate !== storedInfo.lastDueDate) {
          // Delete old message and post new one
          await this.taskManager.slackService.deleteMessage(storedInfo.channel, storedInfo.messageTs);
          
          if (this.isUrgentTask(task)) {
            const messageInfo = await this.taskManager.slackService.postTaskMessage(task);
            this.taskManager.activeTasks.set(pageData.id, {
              messageTs: messageInfo.messageTs,
              channel: messageInfo.channel,
              title: task.title,
              lastDueDate: task.dueDate
            });
          } else {
            this.taskManager.activeTasks.delete(pageData.id);
            await this.taskManager.postTodaysTasks();
          }
        }
      }
    } else {
      // Task not currently active - check if it should be posted
      const task = await this.taskManager.notionService.getTaskById(pageData.id);
      if (task && this.isUrgentTask(task)) {
        await this.taskManager.postSingleTaskIfSpace(task);
      }
    }
  }

  async handleTaskDeleted(pageData) {
    console.log('🗑️ Task deleted:', pageData.id);
    
    if (this.taskManager.activeTasks.has(pageData.id)) {
      const taskInfo = this.taskManager.activeTasks.get(pageData.id);
      await this.taskManager.slackService.deleteMessage(taskInfo.channel, taskInfo.messageTs);
      this.taskManager.activeTasks.delete(pageData.id);
      
      // Post next task if available
      await this.taskManager.postTodaysTasks();
    }
  }

  isUrgentTask(task) {
    const today = new Date().toISOString().split('T')[0];
    return task.dueDate && task.dueDate <= today && !task.completed;
  }
}

module.exports = { NotionWebhookHandler };