require('dotenv').config();
const { TaskManager } = require('./services/task-manager');
const { NotionService } = require('./services/notion');
const { SlackService } = require('./services/slack');

async function triggerPost() {
  try {
    console.log('📤 Manually triggering task posting...');
    
    // Initialize services
    const notionService = new NotionService();
    const slackService = new SlackService();
    const taskManager = new TaskManager(notionService, slackService);
    
    // Initialize known tasks
    await taskManager.initializeKnownTasks();
    
    // Post tasks
    await taskManager.postTodaysTasks();
    
    console.log('✅ Manual task posting completed!');
    
  } catch (error) {
    console.error('❌ Manual task posting failed:', error);
  }
}

triggerPost();