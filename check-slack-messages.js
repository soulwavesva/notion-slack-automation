require('dotenv').config();
const { SlackService } = require('./services/slack');

async function checkSlackMessages() {
  try {
    console.log('🔍 Checking current Slack messages...\n');
    
    const slackService = new SlackService();
    
    const result = await slackService.client.conversations.history({
      channel: process.env.SLACK_CHANNEL_ID,
      limit: 20
    });
    
    const taskMessages = result.messages.filter(message => 
      message.blocks && message.blocks.some(block => 
        block.type === 'section' && 
        block.accessory && 
        block.accessory.action_id === 'mark_done'
      )
    );
    
    console.log(`Found ${taskMessages.length} task messages in Slack:\n`);
    
    taskMessages.forEach((msg, i) => {
      const textBlock = msg.blocks.find(b => b.type === 'section');
      const text = textBlock?.text?.text || 'Unknown';
      const lines = text.split('\n');
      console.log(`${i+1}. ${lines[0]}`);
      if (lines[1]) console.log(`   ${lines[1]}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSlackMessages();