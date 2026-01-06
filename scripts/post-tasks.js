#!/usr/bin/env node

/**
 * Manual script to post tasks - useful for testing
 */

require('dotenv').config();
const { NotionService } = require('../services/notion');
const { SlackService } = require('../services/slack');
const { TaskManager } = require('../services/task-manager');

async function main() {
  try {
    console.log('🚀 Starting manual task posting...');
    
    // Initialize services
    const notionService = new NotionService();
    const slackService = new SlackService();
    const taskManager = new TaskManager(notionService, slackService);
    
    // Post tasks
    await taskManager.postTodaysTasks();
    
    console.log('✅ Manual task posting completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error in manual task posting:', error);
    process.exit(1);
  }
}

main();