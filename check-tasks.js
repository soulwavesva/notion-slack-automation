require('dotenv').config();
const { NotionService } = require('./services/notion');

async function checkTasks() {
  try {
    console.log('🔍 Checking what tasks are available...');
    
    const notionService = new NotionService();
    
    // Check urgent tasks
    console.log('\n=== URGENT TASKS (overdue/due today) ===');
    const urgentTasks = await notionService.getOverdueTasks();
    console.log(`Found ${urgentTasks.length} urgent tasks:`);
    urgentTasks.forEach((task, i) => {
      console.log(`${i+1}. "${task.title}" - Due: ${task.dueDate} (Priority: ${task.priority})`);
    });
    
    // Check upcoming tasks
    console.log('\n=== UPCOMING TASKS (next 3 days) ===');
    const upcomingTasks = await notionService.getUpcomingTasks();
    console.log(`Found ${upcomingTasks.length} upcoming tasks:`);
    upcomingTasks.forEach((task, i) => {
      console.log(`${i+1}. "${task.title}" - Due: ${task.dueDate} (Priority: ${task.priority})`);
    });
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total urgent tasks: ${urgentTasks.length}`);
    console.log(`Total upcoming tasks: ${upcomingTasks.length}`);
    console.log(`Should post: ${Math.min(3, urgentTasks.length + upcomingTasks.length)} tasks`);
    
    if (urgentTasks.length === 0 && upcomingTasks.length === 0) {
      console.log('🎉 No tasks to post - you\'re all caught up!');
    }
    
  } catch (error) {
    console.error('❌ Error checking tasks:', error);
  }
}

checkTasks();