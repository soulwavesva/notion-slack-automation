require('dotenv').config();
const { WebClient } = require('@slack/web-api');

async function testChannelPost() {
  try {
    console.log('🧪 Testing direct post to your channel...');
    
    const client = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    console.log('Channel ID:', process.env.SLACK_CHANNEL_ID);
    
    // Test simple message first
    const result = await client.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text: '🧪 Test message from TaskBot - can you see this?'
    });
    
    console.log('✅ Message posted successfully!');
    console.log('Message timestamp:', result.ts);
    
    // Test with blocks (like our task messages)
    const result2 = await client.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text: 'Task message test',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '📋 *Test Task*\n🟡 *due today*: Jan 6'
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ Done'
            },
            style: 'primary',
            action_id: 'mark_done',
            value: 'test123'
          }
        }
      ]
    });
    
    console.log('✅ Block message posted successfully!');
    console.log('Message timestamp:', result2.ts);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error code:', error.data?.error);
  }
}

testChannelPost();