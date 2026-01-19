require('dotenv').config();
const { SlackService } = require('./services/slack');

async function stopLocalInterference() {
  try {
    console.log('🛑 Stopping all local task management interference...');
    console.log('🚀 Railway is now the ONLY system managing tasks');
    
    const slackService = new SlackService();
    
    // Get current messages to see the state
    const result = await slackService.client.conversations.history({
      channel: process.env.SLACK_CHANNEL_ID,
      limit: 15
    });
    
    const taskMessages = result.messages.filter(message => 
      message.blocks && message.blocks.some(block => 
        block.type === 'section' && 
        block.accessory && 
        block.accessory.action_id === 'mark_done'
      )
    );
    
    console.log(`📊 Current state: ${taskMessages.length} task messages in Slack`);
    
    // Group messages by task content to identify duplicates
    const messageGroups = {};
    taskMessages.forEach(msg => {
      const textBlock = msg.blocks.find(b => b.type === 'section');
      const text = textBlock?.text?.text || 'Unknown';
      const taskTitle = text.split('*')[2] || text; // Extract task title
      
      if (!messageGroups[taskTitle]) {
        messageGroups[taskTitle] = [];
      }
      messageGroups[taskTitle].push(msg);
    });
    
    // Find and remove duplicates (keep only the newest message for each task)
    let duplicatesRemoved = 0;
    for (const [taskTitle, messages] of Object.entries(messageGroups)) {
      if (messages.length > 1) {
        console.log(`🔍 Found ${messages.length} duplicates for: "${taskTitle}"`);
        
        // Sort by timestamp (newest first) and remove all but the first
        messages.sort((a, b) => parseFloat(b.ts) - parseFloat(a.ts));
        const duplicates = messages.slice(1); // All except the newest
        
        for (const duplicate of duplicates) {
          try {
            await slackService.deleteMessage(process.env.SLACK_CHANNEL_ID, duplicate.ts);
            duplicatesRemoved++;
            console.log(`🗑️ Removed duplicate message`);
          } catch (error) {
            console.log(`⚠️ Could not remove duplicate: ${error.message}`);
          }
        }
      }
    }
    
    console.log(`✅ Removed ${duplicatesRemoved} duplicate messages`);
    console.log('🚀 Railway is now managing all tasks exclusively');
    console.log('⏰ Railway will handle:');
    console.log('   - Daily cleanup at 6 AM, 9:30 AM, 9:45 AM, 1 PM EST');
    console.log('   - Completed task checks every 3 minutes');
    console.log('   - New task checks every 5 minutes');
    console.log('   - Task posting every 2 hours (6 AM - 10 PM EST)');
    console.log('');
    console.log('🚫 DO NOT run local sync scripts while Railway is active!');
    console.log('🚫 Local scripts will interfere with Railway\'s task management');
    
  } catch (error) {
    console.error('❌ Error stopping local interference:', error);
  }
}

stopLocalInterference();