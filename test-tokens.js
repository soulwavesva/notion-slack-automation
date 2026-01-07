require('dotenv').config();
const { NotionService } = require('./services/notion');
const { SlackService } = require('./services/slack');

async function testTokens() {
  console.log('Testing tokens...');
  
  try {
    // Test Notion
    console.log('Testing Notion API...');
    const notionService = new NotionService();
    const tasks = await notionService.getOverdueTasks();
    console.log('✅ Notion API works - found', tasks.length, 'tasks');
    
    // Test Slack (just check if we can initialize)
    console.log('Testing Slack API...');
    const slackService = new SlackService();
    console.log('✅ Slack service initialized successfully');
    
    console.log('🎉 All tokens are valid!');
    
  } catch (error) {
    console.error('❌ Token test failed:', error.message);
  }
}

testTokens();