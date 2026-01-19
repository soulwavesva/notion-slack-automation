require('dotenv').config();
const { SlackService } = require('./services/slack');
const { NotionService } = require('./services/notion');
const { TaskManager } = require('./services/task-manager');

async function forceRailwayResync() {
  try {
    console.log('🔄 Forcing Railway to resync by clearing Slack and letting Railway repost...');
    
    const slackService = new SlackService();
    
    // Get all current task messages in Slack
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
    
    console.log(`📱 Found ${taskMessages.length} task messages in Slack`);
    
    // Delete all current task messages to force Railway to repost
    for (const message of taskMessages) {
      try {
        await slackService.deleteMessage(process.env.SLACK_CHANNEL_ID, message.ts);
        console.log('🗑️ Deleted task message to trigger Railway resync');
      } catch (error) {
        console.log(`⚠️ Could not delete message: ${error.message}`);
      }
    }
    
    console.log('✅ Cleared all task messages from Slack');
    console.log('🚀 Railway should detect this within 3-5 minutes and repost all 9 tasks');
    console.log('');
    console.log('⏰ Railway monitoring schedule:');
    console.log('   - Every 3 minutes: Check for completed tasks (will detect missing messages)');
    console.log('   - Every 5 minutes: Check for new tasks');
    console.log('   - Every 2 minutes: Fill available slots (during work hours)');
    console.log('');
    console.log('🔍 Railway will detect that:');
    console.log('   - It has 9 active tasks in memory');
    console.log('   - But 0 messages in Slack');
    console.log('   - And will repost all missing tasks');
    console.log('');
    console.log('⏳ Wait 5 minutes, then run: node check-slack-messages.js');
    
  } catch (error) {
    console.error('❌ Error forcing resync:', error);
  }
}

forceRailwayResync();