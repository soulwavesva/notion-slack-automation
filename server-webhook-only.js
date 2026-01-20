require('dotenv').config();

const { App, ExpressReceiver } = require('@slack/bolt');
const { NotionService } = require('./services/notion');
const { SlackService } = require('./services/slack');
const { TaskManager } = require('./services/task-manager');

// Initialize services
const notionService = new NotionService();
const slackService = new SlackService();
const taskManager = new TaskManager(notionService, slackService);

// Create Express receiver for custom endpoints
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  endpoints: '/slack/events'
});

// Initialize Slack app with Express receiver
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver
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

// Manual trigger endpoints (reliable alternatives to cron)
receiver.app.post('/trigger/sync', async (req, res) => {
  try {
    console.log('🔄 Manual sync triggered');
    await taskManager.cleanupStaleMessages();
    await taskManager.postTodaysTasks();
    res.json({ success: true, message: 'Sync completed' });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

receiver.app.post('/trigger/check-completed', async (req, res) => {
  try {
    console.log('✅ Checking completed tasks');
    await taskManager.checkForCompletedTasks();
    res.json({ success: true, message: 'Completed tasks checked' });
  } catch (error) {
    console.error('Check completed error:', error);
    res.status(500).json({ error: error.message });
  }
});

receiver.app.post('/trigger/check-new', async (req, res) => {
  try {
    console.log('🆕 Checking for new tasks');
    await taskManager.checkForNewTasks();
    res.json({ success: true, message: 'New tasks checked' });
  } catch (error) {
    console.error('Check new error:', error);
    res.status(500).json({ error: error.message });
  }
});

receiver.app.post('/trigger/cleanup', async (req, res) => {
  try {
    console.log('🧹 Running cleanup');
    await taskManager.cleanupStaleMessages();
    res.json({ success: true, message: 'Cleanup completed' });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Slash commands (still work reliably)
app.command('/sync-tasks', async ({ ack, respond }) => {
  await ack();
  
  try {
    await taskManager.cleanupStaleMessages();
    await taskManager.postTodaysTasks();
    await respond('✅ Tasks synced successfully!');
  } catch (error) {
    console.error('Error syncing tasks:', error);
    await respond('❌ Error syncing tasks. Check the logs.');
  }
});

// Health check endpoint
receiver.app.get('/health', (req, res) => {
  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeTasks: taskManager.activeTasks.size,
    maxTasks: taskManager.maxActiveTasks,
    knownTasks: taskManager.knownTaskIds.size,
    environment: process.env.NODE_ENV,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cronStatus: 'disabled - using webhook triggers instead'
  };
  
  console.log('🏥 Health check requested:', status);
  res.json(status);
});

// Status endpoint for debugging
receiver.app.get('/status', (req, res) => {
  const activeTasks = Array.from(taskManager.activeTasks.entries()).map(([id, info]) => ({
    id: id.substring(0, 8) + '...',
    title: info.title,
    priority: info.priority || 'urgent',
    lastDueDate: info.lastDueDate
  }));
  
  const status = {
    server: 'running',
    timestamp: new Date().toISOString(),
    activeTasks: activeTasks,
    totalActive: taskManager.activeTasks.size,
    maxTasks: taskManager.maxActiveTasks,
    availableSlots: taskManager.maxActiveTasks - taskManager.activeTasks.size,
    cronStatus: 'disabled - using external triggers'
  };
  
  console.log('📊 Status check requested:', status);
  res.json(status);
});

// Start the app
(async () => {
  try {
    await app.start(process.env.PORT || 3000);
    console.log('⚡️ Notion-Slack Task Bot is running (WEBHOOK MODE)!');
    console.log(`🚀 Server running on port ${process.env.PORT || 3000}`);
    console.log(`🕐 Current time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Health check: https://notion-slack-automation-production.up.railway.app/health`);
    console.log(`📊 Status check: https://notion-slack-automation-production.up.railway.app/status`);
    console.log('');
    console.log('🚫 CRON JOBS DISABLED - Using webhook triggers instead');
    console.log('📡 Available triggers:');
    console.log('   POST /trigger/sync - Full sync');
    console.log('   POST /trigger/check-completed - Check completed tasks');
    console.log('   POST /trigger/check-new - Check new tasks');
    console.log('   POST /trigger/cleanup - Run cleanup');
    console.log('');
    console.log('💡 Use external cron service (cron-job.org) to trigger these endpoints');
    
    // Post initial tasks on startup
    setTimeout(async () => {
      try {
        console.log('🔄 Initializing task tracking...');
        await taskManager.initializeKnownTasks();
        
        console.log('📤 Posting initial tasks...');
        await taskManager.postTodaysTasks();
        
        console.log('✅ Startup initialization completed successfully');
      } catch (error) {
        console.error('❌ Startup initialization failed:', error);
      }
    }, 2000);
    
  } catch (error) {
    console.error('Failed to start app:', error);
  }
})();