require('dotenv').config();

async function wakeUpRailway() {
  try {
    console.log('🚀 Waking up Railway server...');
    
    const railwayUrl = 'https://notion-slack-automation-production.up.railway.app';
    
    // Try to ping the Railway server
    const response = await fetch(railwayUrl + '/health', {
      method: 'GET',
      timeout: 10000
    }).catch(() => null);
    
    if (response && response.ok) {
      console.log('✅ Railway server is responding');
    } else {
      console.log('⚠️ Railway server might be sleeping or having issues');
    }
    
    // Also try to trigger the manual post-tasks command via Railway
    console.log('📤 Attempting to trigger task posting via Railway...');
    
    // Since we can't directly call Railway's slash commands, let's post tasks locally
    // but this time make sure Railway knows about them by using the same approach
    const { TaskManager } = require('./services/task-manager');
    const { NotionService } = require('./services/notion');
    const { SlackService } = require('./services/slack');
    
    const notionService = new NotionService();
    const slackService = new SlackService();
    const taskManager = new TaskManager(notionService, slackService);
    
    console.log('📋 Posting tasks and ensuring Railway can track them...');
    await taskManager.initializeKnownTasks();
    await taskManager.postTodaysTasks();
    
    console.log('✅ Tasks posted! Railway should now be able to track them.');
    
  } catch (error) {
    console.error('❌ Error waking up Railway:', error);
  }
}

wakeUpRailway();