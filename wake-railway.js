require('dotenv').config();
const https = require('https');

async function wakeRailway() {
  try {
    console.log('🚀 Waking up Railway and triggering task sync...');
    
    // First, check health to wake up the service
    console.log('📡 Pinging Railway health endpoint...');
    const healthData = await makeRequest('https://notion-slack-automation-production.up.railway.app/health');
    console.log(`✅ Railway is awake - Status: ${healthData.status}`);
    
    // Check current status
    const statusData = await makeRequest('https://notion-slack-automation-production.up.railway.app/status');
    console.log(`📊 Active tasks in Railway: ${statusData.totalActive}/${statusData.maxTasks}`);
    
    console.log('⏳ Railway should automatically detect the missing Slack messages and repost them within 5 minutes');
    console.log('🔄 Railway monitors every:');
    console.log('   - 3 minutes: completed tasks');
    console.log('   - 5 minutes: new tasks');
    console.log('   - 2 minutes: fill available slots (during work hours)');
    
    // Wait a moment and check Slack
    console.log('\n⏰ Waiting 30 seconds for Railway to detect and fix the sync...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Check if tasks were posted
    const { SlackService } = require('./services/slack');
    const slackService = new SlackService();
    
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
    
    console.log(`📱 Current Slack messages: ${taskMessages.length}`);
    
    if (taskMessages.length < statusData.totalActive) {
      console.log('🔄 Railway is still syncing - tasks should appear within the next few minutes');
    } else {
      console.log('✅ Railway has successfully synced all tasks to Slack!');
    }
    
  } catch (error) {
    console.error('❌ Error waking Railway:', error.message);
  }
}

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    });
    
    request.on('error', (error) => {
      reject(error);
    });
    
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

wakeRailway();