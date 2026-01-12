require('dotenv').config();
const { NotionService } = require('./services/notion');

async function checkCompleted() {
  try {
    console.log('🔍 Checking completed tasks...');
    
    const notionService = new NotionService();
    
    // Check the specific tasks that were posted
    const taskIds = [
      // We need to find the actual task IDs from the recent posts
    ];
    
    // Get all current urgent tasks to see what's still active
    const urgentTasks = await notionService.getOverdueTasks();
    console.log(`Current urgent tasks: ${urgentTasks.length}`);
    
    urgentTasks.forEach((task, i) => {
      console.log(`${i+1}. "${task.title}" - Due: ${task.dueDate} - ID: ${task.id.substring(0, 8)}...`);
    });
    
    // Check if any of the posted tasks are now completed
    const taskTitles = ["Leadership Meeting", "Review Meeting", "SAM Send Khairul both audios"];
    
    for (const title of taskTitles) {
      const task = urgentTasks.find(t => t.title === title);
      if (!task) {
        console.log(`✅ "${title}" - COMPLETED or NO LONGER URGENT`);
      } else {
        console.log(`⏳ "${title}" - Still urgent`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking completed tasks:', error);
  }
}

checkCompleted();