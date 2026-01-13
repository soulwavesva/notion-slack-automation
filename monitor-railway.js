async function monitorRailway() {
  try {
    console.log('🔍 Monitoring Railway deployment...');
    
    const railwayUrl = 'https://notion-slack-automation-production.up.railway.app';
    
    // Check health endpoint
    console.log('\n=== HEALTH CHECK ===');
    try {
      const healthResponse = await fetch(railwayUrl + '/health');
      if (healthResponse.ok) {
        const health = await healthResponse.json();
        console.log('✅ Railway server is healthy');
        console.log('📊 Server status:', health);
      } else {
        console.log('❌ Health check failed:', healthResponse.status);
      }
    } catch (error) {
      console.log('❌ Cannot reach Railway health endpoint:', error.message);
    }
    
    // Check status endpoint
    console.log('\n=== STATUS CHECK ===');
    try {
      const statusResponse = await fetch(railwayUrl + '/status');
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        console.log('📋 Active tasks on Railway:', status.totalActive);
        console.log('🎯 Available slots:', status.availableSlots);
        console.log('📝 Active task details:', status.activeTasks);
      } else {
        console.log('❌ Status check failed:', statusResponse.status);
      }
    } catch (error) {
      console.log('❌ Cannot reach Railway status endpoint:', error.message);
    }
    
    // Compare with local state
    console.log('\n=== LOCAL COMPARISON ===');
    require('dotenv').config();
    const { NotionService } = require('./services/notion');
    const notionService = new NotionService();
    
    const urgentTasks = await notionService.getOverdueTasks();
    const upcomingTasks = await notionService.getUpcomingTasks();
    
    console.log(`📋 Local Notion state: ${urgentTasks.length} urgent, ${upcomingTasks.length} upcoming`);
    console.log('🎯 Should post:', Math.min(3, urgentTasks.length + upcomingTasks.length), 'tasks');
    
    // Check Slack current state
    const { SlackService } = require('./services/slack');
    const slackService = new SlackService();
    
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
    
    console.log(`💬 Current Slack messages: ${taskMessages.length} task messages`);
    
    console.log('\n=== DIAGNOSIS ===');
    if (taskMessages.length === 0) {
      console.log('🔍 No task messages in Slack - Railway should post tasks');
    } else {
      console.log('📋 Task messages exist - Railway should be monitoring them');
    }
    
  } catch (error) {
    console.error('❌ Monitoring failed:', error);
  }
}

monitorRailway();