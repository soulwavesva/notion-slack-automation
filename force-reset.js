require('dotenv').config();
const { SlackService } = require('./services/slack');
const { TaskManager } = require('./services/task-manager');
const { NotionService } = require('./services/notion');

async function forceReset() {
  try {
    console.log('🔄 Force resetting Slack task messages...');
    
    const slackService = new SlackService();
    const notionService = new NotionService();
    const taskManager = new TaskManager(notionService, slackService);
    
    // Get recent messages from the channel
    const result = await slackService.client.conversations.history({
      channel: process.env.SLACK_CHANNEL_ID,
      limit: 20 // Get last 20 messages
    });
    
    console.log(`Found ${result.messages.length} recent messages`);
    
    // Delete any messages that look like task messages (have buttons)
    let deletedCount = 0;
    for (const message of result.messages) {
      if (message.blocks && message.blocks.some(block => 
        block.type === 'section' && 
        block.accessory && 
        block.accessory.action_id === 'mark_done'
      )) {
        try {
          await slackService.deleteMessage(process.env.SLACK_CHANNEL_ID, message.ts);
          deletedCount++;
          console.log(`🗑️ Deleted stale task message`);
        } catch (error) {
          console.log(`Could not delete message: ${error.message}`);
        }
      }
    }
    
    console.log(`🧹 Deleted ${deletedCount} stale task messages`);
    
    // Now post fresh tasks
    console.log('📤 Posting fresh tasks...');
    await taskManager.initializeKnownTasks();
    await taskManager.postTodaysTasks();
    
    console.log('✅ Force reset completed!');
    
  } catch (error) {
    console.error('❌ Force reset failed:', error);
  }
}

forceReset();