require('dotenv').config();
const { NotionService } = require('./services/notion');

async function debugAssignment() {
  try {
    console.log('🔍 Debugging assignment extraction...\n');
    
    const notionService = new NotionService();
    
    // Get urgent tasks
    const urgentTasks = await notionService.getOverdueTasks();
    
    console.log('=== URGENT TASKS WITH ASSIGNMENTS ===\n');
    urgentTasks.forEach(task => {
      console.log(`Task: "${task.title}"`);
      console.log(`  Due: ${task.dueDate}`);
      console.log(`  Assigned to: ${task.assignedTo?.name || 'UNASSIGNED'} ${task.assignedTo?.emoji || ''}`);
      console.log(`  Full name: ${task.assignedTo?.fullName || 'N/A'}`);
      console.log('');
    });
    
    // Get upcoming tasks
    const upcomingTasks = await notionService.getUpcomingTasks();
    
    console.log('=== UPCOMING TASKS WITH ASSIGNMENTS ===\n');
    upcomingTasks.forEach(task => {
      console.log(`Task: "${task.title}"`);
      console.log(`  Due: ${task.dueDate}`);
      console.log(`  Assigned to: ${task.assignedTo?.name || 'UNASSIGNED'} ${task.assignedTo?.emoji || ''}`);
      console.log(`  Full name: ${task.assignedTo?.fullName || 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugAssignment();