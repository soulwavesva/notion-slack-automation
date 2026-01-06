require('dotenv').config();
const { WebClient } = require('@slack/web-api');

async function testSlack() {
  try {
    console.log('🧪 Testing Slack connection...');
    
    const client = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Test posting a simple message
    const result = await client.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text: '🎉 Bot connection test successful!'
    });
    
    console.log('✅ Slack works! Message posted successfully');
    console.log('Message timestamp:', result.ts);
    
    // Test deleting the message
    setTimeout(async () => {
      try {
        await client.chat.delete({
          channel: process.env.SLACK_CHANNEL_ID,
          ts: result.ts
        });
        console.log('✅ Message deleted successfully');
      } catch (error) {
        console.log('⚠️ Could not delete (permissions), but posting works!');
      }
    }, 2000);
    
  } catch (error) {
    console.error('❌ Slack error:', error.message);
  }
}

testSlack();