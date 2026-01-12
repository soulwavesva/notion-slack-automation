require('dotenv').config();
const { SlackService } = require('./services/slack');
const { NotionService } = require('./services/notion');
const { TaskManager } = require('./services/task-manager');

async function syncWithNotion() {
  try {
    console.log('🔄 Syncing Slack with current Notion state...');
    
    const slackService = new SlackService();
    const notionService = new NotionService();
    const taskManager = new TaskManager(notionService, slackService);
    
    // Get current urgent tasks from Notion
    const currentUrgentTasks = await notionService.getOverdueTasks();
    const currentUpcomingTasks = await notionService.getUpcomingTasks();
    
    console.log(`Current Notion state: ${currentUrgentTasks.length} urgent, ${currentUpcomingTasks.length} upcoming`);
    
    // Get recent Slack messages
    const result = await slackService.client.conversations.history({
      channel: process.env.SLACK_CHANNEL_ID,
      limit: 10
    });
    
    // Find task messages
    const taskMessages = result.messages.filter(message => 
      message.blocks && message.blocks.some(block => 
        block.type === 'section' && 
        block.accessory && 
        block.accessory.action_id === 'mark_done'
      )
    );
    
    console.log(`Found ${taskMessages.length} task messages in Slack`);
    
    // Delete all current task messages (they're out of sync)
    for (const message of taskMessages) {
      try {
        await slackService.deleteMessage(process.env.SLACK_CHANNEL_ID, message.ts);
        console.log('🗑️ Deleted out-of-sync task message');
      } catch (error) {
        console.log(`Could not delete message: ${error.message}`);
      }
    }
    
    // Post fresh tasks based on current Notion state
    console.log('📤 Posting fresh tasks based on current Notion state...');
    await taskManager.initializeKnownTasks();
    await taskManager.postTodaysTasks();
    
    console.log('✅ Sync completed! Slack now matches Notion.');
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

syncWithNotion();