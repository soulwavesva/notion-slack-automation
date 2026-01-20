const { NotionService } = require('../lib/notion-service');
const { SlackService } = require('../lib/slack-service');

module.exports = async (req, res) => {
  try {
    console.log('🕛 Daily cron job triggered at midnight EST');
    
    const notionService = new NotionService();
    const slackService = new SlackService();
    
    // Get fresh tasks from Notion
    const urgentTasks = await notionService.getOverdueTasks();
    const upcomingTasks = await notionService.getUpcomingTasks();
    
    // Combine and organize by person (3 tasks per person max)
    const allTasks = [...urgentTasks, ...upcomingTasks];
    const tasksByPerson = {
      'ROB': [],
      'SAM': [],
      'ANNA': [],
      'UNASSIGNED': []
    };
    
    allTasks.forEach(task => {
      const personName = task.assignedTo?.name || 'UNASSIGNED';
      if (tasksByPerson[personName]) {
        tasksByPerson[personName].push(task);
      } else {
        tasksByPerson['UNASSIGNED'].push(task);
      }
    });
    
    // Post up to 3 tasks per person
    const tasksToPost = [];
    ['ROB', 'SAM', 'ANNA', 'UNASSIGNED'].forEach(person => {
      const personTasks = tasksByPerson[person]
        .sort((a, b) => {
          if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
          if (a.priority !== 'urgent' && b.priority === 'urgent') return 1;
          return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
        })
        .slice(0, 3);
      tasksToPost.push(...personTasks);
    });
    
    // Post tasks to Slack
    const postedTasks = [];
    for (const task of tasksToPost.slice(0, 9)) {
      try {
        await slackService.postTaskMessage(task);
        postedTasks.push(task.title);
      } catch (error) {
        console.error(`Failed to post task ${task.title}:`, error);
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Daily cron completed successfully',
      timestamp: new Date().toISOString(),
      tasksPosted: postedTasks.length,
      schedule: 'Daily at 12 AM EST (midnight)'
    });
    
  } catch (error) {
    console.error('Daily cron error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};