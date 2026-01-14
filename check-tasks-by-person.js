require('dotenv').config();
const { NotionService } = require('./services/notion');

async function checkTasksByPerson() {
  try {
    console.log('🔍 Checking tasks organized by person...\n');
    
    const notionService = new NotionService();
    
    // Get urgent and upcoming tasks
    const urgentTasks = await notionService.getOverdueTasks();
    const upcomingTasks = await notionService.getUpcomingTasks();
    
    const allTasks = [...urgentTasks, ...upcomingTasks];
    
    // Group by person
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
    
    // Display tasks by person
    ['ROB', 'SAM', 'ANNA', 'UNASSIGNED'].forEach(person => {
      const tasks = tasksByPerson[person];
      console.log(`\n=== ${person} (${tasks.length} tasks) ===`);
      
      if (tasks.length === 0) {
        console.log('  No tasks');
      } else {
        tasks.forEach((task, i) => {
          const priorityEmoji = task.priority === 'urgent' ? '🔴' : '🟢';
          console.log(`  ${i+1}. ${priorityEmoji} "${task.title}" - Due: ${task.dueDate}`);
        });
      }
    });
    
    console.log('\n=== SUMMARY ===');
    console.log(`ROB: ${tasksByPerson['ROB'].length} tasks (can post ${Math.min(3, tasksByPerson['ROB'].length)})`);
    console.log(`SAM: ${tasksByPerson['SAM'].length} tasks (can post ${Math.min(3, tasksByPerson['SAM'].length)})`);
    console.log(`ANNA: ${tasksByPerson['ANNA'].length} tasks (can post ${Math.min(3, tasksByPerson['ANNA'].length)})`);
    console.log(`UNASSIGNED: ${tasksByPerson['UNASSIGNED'].length} tasks (can post ${Math.min(3, tasksByPerson['UNASSIGNED'].length)})`);
    console.log(`\nTotal that should be posted: ${Math.min(9, allTasks.length)} tasks`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTasksByPerson();