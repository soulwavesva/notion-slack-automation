require('dotenv').config();
const { TaskManager } = require('./services/task-manager');
const { NotionService } = require('./services/notion');
const { SlackService } = require('./services/slack');

async function quickUpdate() {
  try {
    console.log('⚡ Quick update: Syncing Slack with Notion...');
    
    const notionService = new NotionService();
    const slackService = new SlackService();
    const taskManager = new TaskManager(notionService, slackService);
    
    // Get current state
    const urgentTasks = await notionService.getOverdueTasks();
    const upcomingTasks = await notionService.getUpcomingTasks();
    
    console.log(`Current Notion: ${urgentTasks.length} urgent, ${upcomingTasks.length} upcoming`);
    
    // Get Slack messages
    const result = await slackService.client.conversations.history({
      channel: process.env.SLACK_CHANNEL_ID,
      limit: 10
    });
    
    const taskMessages = result.messages.filter(message => 
      message.blocks && message.blocks.some(block => 
        block.type === 'section' && 
        block.accessory && 
        block.accessory.action_id === 'mark_done'
      )
    );
    
    console.log(`Current Slack: ${taskMessages.length} task messages`);
    
    // Simple approach: Clear and repost
    console.log('🧹 Clearing current messages...');
    for (const message of taskMessages) {
      try {
        await slackService.deleteMessage(process.env.SLACK_CHANNEL_ID, message.ts);
      } catch (error) {
        // Ignore delete errors
      }
    }
    
    console.log('📤 Posting fresh tasks...');
    await taskManager.initializeKnownTasks();
    await taskManager.postTodaysTasks();
    
    console.log('✅ Quick update completed!');
    console.log('💡 Run this script anytime you want to sync Slack with Notion');
    
  } catch (error) {
    console.error('❌ Quick update failed:', error);
  }
}

quickUpdate();