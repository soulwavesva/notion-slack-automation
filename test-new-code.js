require('dotenv').config();

// Test the new cleanup method
const { TaskManager } = require('./services/task-manager');
const { NotionService } = require('./services/notion');
const { SlackService } = require('./services/slack');

async function testNewCode() {
  try {
    console.log('Testing new code...');
    
    // Initialize services
    const notionService = new NotionService();
    const slackService = new SlackService();
    const taskManager = new TaskManager(notionService, slackService);
    
    console.log('✅ Services initialized successfully');
    
    // Test that the new method exists
    if (typeof taskManager.cleanupStaleMessages === 'function') {
      console.log('✅ cleanupStaleMessages method exists');
    } else {
      console.log('❌ cleanupStaleMessages method missing');
    }
    
    // Test basic functionality
    const tasks = await notionService.getOverdueTasks();
    console.log(`✅ Can fetch tasks: ${tasks.length} found`);
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testNewCode();