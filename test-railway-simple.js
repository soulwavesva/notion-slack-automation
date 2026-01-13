require('dotenv').config();

// Simple test to see if Railway environment is working
console.log('=== RAILWAY ENVIRONMENT TEST ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('NOTION_API_KEY:', process.env.NOTION_API_KEY ? 'SET' : 'MISSING');
console.log('SLACK_BOT_TOKEN:', process.env.SLACK_BOT_TOKEN ? 'SET' : 'MISSING');
console.log('SLACK_CHANNEL_ID:', process.env.SLACK_CHANNEL_ID ? 'SET' : 'MISSING');

// Test basic functionality
async function testBasics() {
  try {
    const { NotionService } = require('./services/notion');
    const notionService = new NotionService();
    
    console.log('\n=== TESTING NOTION CONNECTION ===');
    const tasks = await notionService.getOverdueTasks();
    console.log(`✅ Notion works: Found ${tasks.length} urgent tasks`);
    
    console.log('\n=== TESTING SLACK CONNECTION ===');
    const { SlackService } = require('./services/slack');
    const slackService = new SlackService();
    console.log('✅ Slack service initialized');
    
    console.log('\n=== TESTING CRON TIMING ===');
    const now = new Date();
    const hour = now.getHours();
    const isWorkHours = hour >= 6 && hour <= 22;
    console.log(`Current time: ${now.toLocaleString()}`);
    console.log(`Current hour: ${hour}`);
    console.log(`Is work hours (6-22): ${isWorkHours}`);
    
    console.log('\n✅ All basic tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBasics();