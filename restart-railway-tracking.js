require('dotenv').config();
const { SlackService } = require('./services/slack');

async function restartRailwayTracking() {
  try {
    console.log('🔄 Restarting Railway tracking by clearing all task messages...');
    
    const slackService = new SlackService();
    
    // Get recent messages from the channel
    const result = await slackService.client.conversations.history({
      channel: process.env.SLACK_CHANNEL_ID,
      limit: 20
    });
    
    // Find all task messages
    const taskMessages = result.messages.filter(message => 
      message.blocks && message.blocks.some(block => 
        block.type === 'section' && 
        block.accessory && 
        block.accessory.action_id === 'mark_done'
      )
    );
    
    console.log(`Found ${taskMessages.length} task messages to clear`);
    
    // Delete ALL task messages so Railway can start fresh
    for (const message of taskMessages) {
      try {
        await slackService.deleteMessage(process.env.SLACK_CHANNEL_ID, message.ts);
        console.log('🗑️ Cleared task message');
        await new Promise(resolve => setTimeout(resolve, 200)); // Avoid rate limits
      } catch (error) {
        console.log(`Could not delete message: ${error.message}`);
      }
    }
    
    console.log('✅ All task messages cleared.');
    console.log('🚀 Railway will now detect the empty channel and post fresh tasks within 2-5 minutes.');
    console.log('📋 Railway will then properly track these tasks for completion monitoring.');
    
  } catch (error) {
    console.error('❌ Failed to restart Railway tracking:', error);
  }
}

restartRailwayTracking();