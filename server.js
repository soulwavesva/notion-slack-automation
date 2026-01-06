require('dotenv').config();
const { App } = require('@slack/bolt');
const express = require('express');
const cron = require('node-cron');
const { NotionService } = require('./services/notion');
const { SlackService } = require('./services/slack');
const { TaskManager } = require('./services/task-manager');
const { NotionWebhookHandler } = require('./services/webhook-handler');

// Initialize services
const notionService = new NotionService();
const slackService = new SlackService();
const taskManager = new TaskManager(notionService, slackService);

// Initialize webhook handler
const webhookHandler = new NotionWebhookHandler(taskManager, process.env.NOTION_WEBHOOK_SECRET || 'temp-secret');

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
  port: process.env.PORT || 3000
});

// Add webhook endpoint for Notion (after app is initialized)
const expressApp = app.receiver.app;
expressApp.use('/notion/webhook', express.raw({type: 'application/json'}));
expressApp.post('/notion/webhook', async (req, res) => {
  await webhookHandler.handleWebhook(req, res);
});

// Handle "Done" button clicks
app.action('mark_done', async ({ ack, body, client }) => {
  await ack();
  
  try {
    const taskId = body.actions[0].value;
    const messageTs = body.message.ts;
    const channelId = body.channel.id;
    
    console.log(`Processing "Done" click for task: ${taskId}`);
    
    // Mark task as done in Notion (check the checkbox)
    await notionService.markTaskComplete(taskId);
    
    // Delete the Slack message
    await slackService.deleteMessage(channelId, messageTs);
    
    // Remove from active tasks and post next task if available
    await taskManager.handleTaskCompletion(taskId);
    
    console.log(`Task ${taskId} marked as complete`);
    
  } catch (error) {
    console.error('Error handling task completion:', error);
  }
});

// Schedule task posting every hour from 6 AM to 10 PM EST, Monday through Sunday
cron.schedule('0 6-22 * * 0-6', async () => {
  console.log('Running scheduled task check (6 AM - 10 PM EST, Mon-Sun)...');
  await taskManager.postTodaysTasks();
}, {
  timezone: "America/New_York" // EST timezone
});

// Optimized monitoring: Only check when needed
// Check for new tasks every 5 minutes (reduced from 2)
cron.schedule('*/5 * * * *', async () => {
  // Only check if we have available slots
  if (taskManager.activeTasks.size < taskManager.maxActiveTasks) {
    await taskManager.checkForNewTasks();
  }
}, {
  timezone: "America/New_York"
});

// Check for completed tasks every 3 minutes (reduced from 5)
cron.schedule('*/3 * * * *', async () => {
  await taskManager.checkForCompletedTasks();
}, {
  timezone: "America/New_York"
});

// Check for task updates every 15 minutes (reduced from 10)
cron.schedule('*/15 * * * *', async () => {
  await taskManager.checkForUpdatedTasks();
}, {
  timezone: "America/New_York"
});

// Manual trigger endpoint
app.command('/post-tasks', async ({ ack, respond }) => {
  await ack();
  
  try {
    await taskManager.postTodaysTasks();
    await respond('✅ Posted today\'s overdue tasks to Slack!');
  } catch (error) {
    console.error('Error posting tasks:', error);
    await respond('❌ Error posting tasks. Check the logs.');
  }
});

// Manual new task check
app.command('/check-new', async ({ ack, respond }) => {
  await ack();
  
  try {
    await taskManager.checkForNewTasks();
    await respond('✅ Checked for new tasks!');
  } catch (error) {
    console.error('Error checking new tasks:', error);
    await respond('❌ Error checking for new tasks. Check the logs.');
  }
});

// Manual completed task check
app.command('/check-completed', async ({ ack, respond }) => {
  await ack();
  
  try {
    await taskManager.checkForCompletedTasks();
    await respond('✅ Checked for completed tasks!');
  } catch (error) {
    console.error('Error checking completed tasks:', error);
    await respond('❌ Error checking completed tasks. Check the logs.');
  }
});

// Manual updated task check
app.command('/check-updates', async ({ ack, respond }) => {
  await ack();
  
  try {
    await taskManager.checkForUpdatedTasks();
    await respond('✅ Checked for task updates!');
  } catch (error) {
    console.error('Error checking task updates:', error);
    await respond('❌ Error checking task updates. Check the logs.');
  }
});

// Health check endpoint
expressApp.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    activeTasks: taskManager.activeTasks.size,
    maxTasks: taskManager.maxActiveTasks
  });
});

// Start the app
(async () => {
  try {
    await app.start();
    console.log('⚡️ Notion-Slack Task Bot is running!');
    console.log(`🚀 Server running on port ${process.env.PORT || 3000}`);
    
    // Post initial tasks on startup
    setTimeout(async () => {
      console.log('Initializing task tracking...');
      await taskManager.initializeKnownTasks();
      
      console.log('Posting initial tasks...');
      await taskManager.postTodaysTasks();
    }, 2000);
    
  } catch (error) {
    console.error('Failed to start app:', error);
  }
})();