require('dotenv').config();
const https = require('https');

async function checkRailwayHealth() {
  try {
    console.log('🏥 Checking Railway health...');
    
    // Check health endpoint
    const healthData = await makeRequest('https://notion-slack-automation-production.up.railway.app/health');
    console.log('✅ Railway Health Check:');
    console.log(`   Status: ${healthData.status}`);
    console.log(`   Uptime: ${Math.floor(healthData.uptime / 60)} minutes`);
    console.log(`   Active Tasks: ${healthData.activeTasks}/${healthData.maxTasks}`);
    console.log(`   Known Tasks: ${healthData.knownTasks}`);
    console.log(`   Environment: ${healthData.environment}`);
    console.log(`   Timezone: ${healthData.timezone}`);
    
    // Check status endpoint
    const statusData = await makeRequest('https://notion-slack-automation-production.up.railway.app/status');
    console.log('\n📊 Railway Status:');
    console.log(`   Server: ${statusData.server}`);
    console.log(`   Total Active: ${statusData.totalActive}/${statusData.maxTasks}`);
    console.log(`   Available Slots: ${statusData.availableSlots}`);
    
    if (statusData.activeTasks && statusData.activeTasks.length > 0) {
      console.log('\n📋 Current Active Tasks:');
      statusData.activeTasks.forEach((task, i) => {
        console.log(`   ${i+1}. ${task.title} (${task.priority})`);
      });
    } else {
      console.log('\n📋 No active tasks currently');
    }
    
    // Check if Railway is healthy
    if (healthData.status === 'healthy' && statusData.server === 'running') {
      console.log('\n✅ Railway is healthy and running properly!');
      console.log('🚀 Task automation is active and monitoring Notion');
      console.log('⏰ Next scheduled actions:');
      console.log('   - Completed task check: every 3 minutes');
      console.log('   - New task check: every 5 minutes');
      console.log('   - Task posting: every 2 hours (6 AM - 10 PM EST)');
      console.log('   - Daily cleanup: 6 AM, 9:30 AM, 9:45 AM, 1 PM EST');
    } else {
      console.log('\n⚠️ Railway may have issues - check the logs');
    }
    
  } catch (error) {
    console.error('❌ Railway health check failed:', error.message);
    console.log('🔧 Possible issues:');
    console.log('   - Railway app is sleeping (will wake up on next request)');
    console.log('   - Network connectivity issues');
    console.log('   - Railway deployment problems');
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

checkRailwayHealth();