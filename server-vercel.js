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

// Vercel Daily Cron endpoint (called once daily at 6 AM EST)
receiver.app.get('/api/cron/daily-sync', async (req, res) => {
  try {
    console.log('🔄 [VERCEL DAILY CRON] Running comprehensive daily sync at 6 AM EST');
    
    // Run all maintenance tasks in sequence
    console.log('🧹 Cleaning up stale messages...');
    await taskManager.cleanupStaleMessages();
    
    console.log('✅ Checking for completed tasks...');
    await taskManager.checkForCompletedTasks();
    
    console.log('🆕 Checking for new tasks...');
    await taskManager.checkForNewTasks();
    
    console.log('📤 Posting fresh tasks...');
    await taskManager.postTodaysTasks();
    
    res.json({ 
      success: true, 
      message: 'Daily sync completed successfully', 
      timestamp: new Date().toISOString(),
      schedule: 'Daily at 6 AM EST',
      note: 'Use /trigger/sync for manual updates anytime'
    });
  } catch (error) {
    console.error('Daily sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Legacy endpoints (kept for compatibility)
receiver.app.get('/api/cron/check-completed', async (req, res) => {
  try {
    console.log('✅ [VERCEL CRON] Checking completed tasks');
    await taskManager.checkForCompletedTasks();
    res.json({ success: true, message: 'Completed tasks checked', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Check completed error:', error);
    res.status(500).json({ error: error.message });
  }
});

receiver.app.get('/api/cron/check-new', async (req, res) => {
  try {
    console.log('🆕 [VERCEL CRON] Checking for new tasks');
    await taskManager.checkForNewTasks();
    res.json({ success: true, message: 'New tasks checked', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Check new error:', error);
    res.status(500).json({ error: error.message });
  }
});

receiver.app.get('/api/cron/cleanup', async (req, res) => {
  try {
    console.log('🧹 [VERCEL CRON] Running cleanup');
    await taskManager.cleanupStaleMessages();
    res.json({ success: true, message: 'Cleanup completed', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: error.message });
  }
});

receiver.app.get('/api/cron/sync', async (req, res) => {
  try {
    console.log('🔄 [VERCEL CRON] Full sync');
    await taskManager.cleanupStaleMessages();
    await taskManager.postTodaysTasks();
    res.json({ success: true, message: 'Full sync completed', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manual trigger endpoints
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

// Slash commands
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

// Health check endpoint
receiver.app.get('/health', (req, res) => {
  const status = {
    status: 'healthy',
    platform: 'vercel',
    timestamp: new Date().toISOString(),
    activeTasks: taskManager.activeTasks.size,
    maxTasks: taskManager.maxActiveTasks,
    knownTasks: taskManager.knownTaskIds.size,
    environment: process.env.NODE_ENV,
    cronStatus: 'vercel-native-cron-enabled'
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
    platform: 'vercel',
    timestamp: new Date().toISOString(),
    activeTasks: activeTasks,
    totalActive: taskManager.activeTasks.size,
    maxTasks: taskManager.maxActiveTasks,
    availableSlots: taskManager.maxActiveTasks - taskManager.activeTasks.size,
    cronStatus: 'vercel-native-cron'
  };
  
  console.log('📊 Status check requested:', status);
  res.json(status);
});

// Initialize on startup (for Vercel serverless)
let initialized = false;

async function initializeIfNeeded() {
  if (!initialized) {
    try {
      console.log('🔄 [VERCEL] Initializing task tracking...');
      await taskManager.initializeKnownTasks();
      
      console.log('📤 [VERCEL] Posting initial tasks...');
      await taskManager.postTodaysTasks();
      
      initialized = true;
      console.log('✅ [VERCEL] Initialization completed successfully');
    } catch (error) {
      console.error('❌ [VERCEL] Initialization failed:', error);
    }
  }
}

// Middleware to initialize on first request
receiver.app.use(async (req, res, next) => {
  await initializeIfNeeded();
  next();
});

// Export for Vercel
module.exports = receiver.app;

// For local development
if (require.main === module) {
  const port = process.env.PORT || 3000;
  receiver.app.listen(port, () => {
    console.log('⚡️ Notion-Slack Task Bot is running on Vercel!');
    console.log(`🚀 Server running on port ${port}`);
    console.log(`🕐 Current time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log('✅ Vercel native cron jobs enabled');
  });
}