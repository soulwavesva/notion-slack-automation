require('dotenv').config();
const { SlackService } = require('./services/slack');

async function stopDuplicates() {
  try {
    console.log('🛑 Stopping duplicate task messages...');
    
    const slackService = new SlackService();
    
    // Get recent messages from the channel
    const result = await slackService.client.conversations.history({
      channel: process.env.SLACK_CHANNEL_ID,
      limit: 50 // Get more messages to catch all duplicates
    });
    
    console.log(`Found ${result.messages.length} recent messages`);
    
    // Find all task messages (messages with "Done" buttons)
    const taskMessages = result.messages.filter(message => 
      message.blocks && message.blocks.some(block => 
        block.type === 'section' && 
        block.accessory && 
        block.accessory.action_id === 'mark_done'
      )
    );
    
    console.log(`Found ${taskMessages.length} task messages`);
    
    // Delete ALL task messages to clear the slate
    let deletedCount = 0;
    for (const message of taskMessages) {
      try {
        await slackService.deleteMessage(process.env.SLACK_CHANNEL_ID, message.ts);
        deletedCount++;
        console.log(`🗑️ Deleted task message ${deletedCount}`);
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.log(`Could not delete message: ${error.message}`);
      }
    }
    
    console.log(`🧹 Deleted ${deletedCount} task messages`);
    console.log('✅ All task messages cleared. Railway will post fresh ones within 2-5 minutes.');
    
  } catch (error) {
    console.error('❌ Failed to stop duplicates:', error);
  }
}

stopDuplicates();