const https = require('https');

async function triggerRailwaySync() {
  try {
    console.log('🚀 Triggering Railway to sync tasks...');
    
    // Since Railway's cron isn't working, we'll trigger a manual sync
    // by hitting the health endpoint multiple times to wake it up
    // and then run our local sync
    
    console.log('📡 Pinging Railway to wake it up...');
    await makeRequest('https://notion-slack-automation-production.up.railway.app/health');
    
    console.log('🔄 Running local sync to force update...');
    
    // Import and run the sync locally
    require('dotenv').config();
    const { SlackService } = require('./services/slack');
    const { NotionService } = require('./services/notion');
    const { TaskManager } = require('./services/task-manager');
    
    const slackService = new SlackService();
    const notionService = new NotionService();
    const taskManager = new TaskManager(notionService, slackService);
    
    // Clean up and repost tasks
    console.log('🧹 Cleaning up stale messages...');
    await taskManager.cleanupStaleMessages();
    
    console.log('📤 Posting fresh tasks...');
    await taskManager.initializeKnownTasks();
    await taskManager.postTodaysTasks();
    
    console.log('✅ Manual sync completed!');
    console.log('');
    console.log('💡 Since Railway cron is unreliable, you can:');
    console.log('   1. Run this script when you need updates: node trigger-railway-sync.js');
    console.log('   2. Set up external cron service (see EXTERNAL_CRON_SETUP.md)');
    console.log('   3. Switch to a different hosting platform');
    
  } catch (error) {
    console.error('❌ Error triggering sync:', error.message);
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
          resolve(data); // Return raw data if not JSON
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

triggerRailwaySync();