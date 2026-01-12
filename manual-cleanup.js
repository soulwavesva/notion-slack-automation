require('dotenv').config();
const { TaskManager } = require('./services/task-manager');
const { NotionService } = require('./services/notion');
const { SlackService } = require('./services/slack');

async function manualCleanup() {
  try {
    console.log('🧹 Running manual cleanup...');
    
    // Initialize services
    const notionService = new NotionService();
    const slackService = new SlackService();
    const taskManager = new TaskManager(notionService, slackService);
    
    // Initialize known tasks first
    await taskManager.initializeKnownTasks();
    
    // Run cleanup
    await taskManager.cleanupStaleMessages();
    
    console.log('✅ Manual cleanup completed!');
    
  } catch (error) {
    console.error('❌ Manual cleanup failed:', error);
  }
}

manualCleanup();