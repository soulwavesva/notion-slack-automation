// Manual sync endpoint for Vercel
const { NotionService } = require('../services/notion');
const { SlackService } = require('../services/slack');
const { TaskManager } = require('../services/task-manager');

module.exports = async (req, res) => {
  try {
    console.log('🔄 Manual sync triggered via API');
    
    // Initialize services
    const notionService = new NotionService();
    const slackService = new SlackService();
    const taskManager = new TaskManager(notionService, slackService);
    
    // Initialize known tasks
    await taskManager.initializeKnownTasks();
    
    // Run cleanup and sync
    await taskManager.cleanupStaleMessages();
    await taskManager.checkForCompletedTasks();
    await taskManager.checkForNewTasks();
    await taskManager.postTodaysTasks();
    
    res.status(200).json({
      success: true,
      message: 'Manual sync completed successfully',
      timestamp: new Date().toISOString(),
      platform: 'vercel'
    });
    
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};