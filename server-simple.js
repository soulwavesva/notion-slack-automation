require('dotenv').config();

// Debug environment variables
console.log('Environment check:');
console.log('SLACK_BOT_TOKEN:', process.env.SLACK_BOT_TOKEN ? 'SET' : 'MISSING');
console.log('SLACK_SIGNING_SECRET:', process.env.SLACK_SIGNING_SECRET ? 'SET' : 'MISSING');
console.log('NOTION_API_KEY:', process.env.NOTION_API_KEY ? 'SET' : 'MISSING');
console.log('NOTION_DATABASE_ID:', process.env.NOTION_DATABASE_ID ? 'SET' : 'MISSING');
console.log('SLACK_CHANNEL_ID:', process.env.SLACK_CHANNEL_ID ? 'SET' : 'MISSING');

const { App } = require('@slack/bolt');
const cron = require('node-cron');
const { NotionService } = require('./services/notion');
const { SlackService } = require('./services/slack');
const { TaskManager } = require('./services/task-manager');

// Initialize services
const notionService = new NotionService();
const slackService = new SlackService();
const taskManager = new TaskManager(notionService, slackService);

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
  port: process.env.PORT || 3000
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

// Optimized monitoring: Only check when needed
// Check for new tasks every 5 minutes (reduced from 2)
cron.schedule('*/5 * * * *', async () => {
  try {
    console.log(`🔍 [${new Date().toLocaleTimeString()}] Checking for new tasks...`);
    await taskManager.checkForNewTasks();
  } catch (error) {
    console.error('❌ Error in new task check:', error);
  }
}, {
  timezone: "America/New_York"
});

// Check for completed tasks every 3 minutes (reduced from 5)
cron.schedule('*/3 * * * *', async () => {
  try {
    console.log(`✅ [${new Date().toLocaleTimeString()}] Checking for completed tasks...`);
    await taskManager.checkForCompletedTasks();
  } catch (error) {
    console.error('❌ Error in completed task check:', error);
  }
}, {
  timezone: "America/New_York"
});

// Fill available slots every 2 minutes during work hours
cron.schedule('*/2 6-22 * * 0-6', async () => {
  try {
    const availableSlots = taskManager.maxActiveTasks - taskManager.activeTasks.size;
    if (availableSlots > 0) {
      console.log(`🔄 [${new Date().toLocaleTimeString()}] Quick check: ${availableSlots} slots available - trying to fill them`);
      await taskManager.postTodaysTasks();
    } else {
      console.log(`📋 [${new Date().toLocaleTimeString()}] All slots filled (${taskManager.activeTasks.size}/${taskManager.maxActiveTasks})`);
    }
  } catch (error) {
    console.error('❌ Error in slot filling:', error);
  }
}, {
  timezone: "America/New_York"
});

// Check for task updates every 15 minutes (reduced from 10)
cron.schedule('*/15 * * * *', async () => {
  await taskManager.checkForUpdatedTasks();
}, {
  timezone: "America/New_York"
});

// Clean up stale messages at 6 AM every day (start of work day)
cron.schedule('0 6 * * 0-6', async () => {
  console.log('Running daily cleanup at 6 AM...');
  try {
    await taskManager.cleanupStaleMessages();
  } catch (error) {
    console.error('Error during daily cleanup:', error);
  }
}, {
  timezone: "America/New_York"
});

// Schedule task posting every 2 hours from 6 AM to 10 PM EST, Monday through Sunday
cron.schedule('0 6,8,10,12,14,16,18,20,22 * * 0-6', async () => {
  console.log('Running scheduled task check (every 2 hours, 6 AM - 10 PM EST, Mon-Sun)...');
  try {
    await taskManager.postTodaysTasks();
  } catch (error) {
    console.error('Error in scheduled task posting:', error);
  }
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

// Manual cleanup command (alternative: try /clean-tasks if /cleanup doesn't work)
app.command('/cleanup', async ({ ack, respond }) => {
  await ack();
  
  try {
    await taskManager.cleanupStaleMessages();
    await respond('✅ Cleaned up stale messages!');
  } catch (error) {
    console.error('Error during cleanup:', error);
    await respond('❌ Error during cleanup. Check the logs.');
  }
});

// Alternative cleanup command in case /cleanup isn't registered
app.command('/clean-tasks', async ({ ack, respond }) => {
  await ack();
  
  try {
    await taskManager.cleanupStaleMessages();
    await respond('✅ Cleaned up stale messages!');
  } catch (error) {
    console.error('Error during cleanup:', error);
    await respond('❌ Error during cleanup. Check the logs.');
  }
});

// Health check endpoint
app.use('/health', (req, res) => {
  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    activeTasks: taskManager.activeTasks.size,
    maxTasks: taskManager.maxActiveTasks,
    knownTasks: taskManager.knownTaskIds.size,
    environment: process.env.NODE_ENV,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
  
  console.log('🏥 Health check requested:', status);
  res.json(status);
});

// Status endpoint for debugging
app.use('/status', (req, res) => {
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
    availableSlots: taskManager.maxActiveTasks - taskManager.activeTasks.size
  };
  
  console.log('📊 Status check requested:', status);
  res.json(status);
});
    await respond('✅ Cleaned up stale messages!');
  } catch (error) {
    console.error('Error during cleanup:', error);
    await respond('❌ Error during cleanup. Check the logs.');
  }
});

// Start the app
(async () => {
  try {
    await app.start();
    console.log('⚡️ Notion-Slack Task Bot is running!');
    console.log(`🚀 Server running on port ${process.env.PORT || 3000}`);
    console.log(`🕐 Current time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} EST`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    
    // Post initial tasks on startup with better error handling
    setTimeout(async () => {
      try {
        console.log('🔄 Initializing task tracking...');
        await taskManager.initializeKnownTasks();
        
        console.log('📤 Posting initial tasks...');
        await taskManager.postTodaysTasks();
        
        console.log('✅ Startup initialization completed successfully');
      } catch (error) {
        console.error('❌ Startup initialization failed:', error);
        // Try again in 30 seconds
        setTimeout(async () => {
          try {
            console.log('🔄 Retrying startup initialization...');
            await taskManager.initializeKnownTasks();
            await taskManager.postTodaysTasks();
            console.log('✅ Retry successful');
          } catch (retryError) {
            console.error('❌ Retry also failed:', retryError);
          }
        }, 30000);
      }
    }, 2000);
    
  } catch (error) {
    console.error('Failed to start app:', error);
  }
})();