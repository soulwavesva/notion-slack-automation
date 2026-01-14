require('dotenv').config();
const { Client } = require('@notionhq/client');

async function debugSamTask() {
  try {
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });
    
    console.log('🔍 Looking for SAM\'s task...\n');
    
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      page_size: 100
    });
    
    console.log('=== ALL TASKS WITH ASSIGNED PEOPLE ===\n');
    
    response.results.forEach(page => {
      const titleProp = Object.values(page.properties).find(p => p.type === 'title');
      const title = titleProp?.title[0]?.plain_text || 'Untitled';
      
      const assignedProp = page.properties['Assigned To'];
      if (assignedProp && assignedProp.people && assignedProp.people.length > 0) {
        const person = assignedProp.people[0];
        console.log(`Task: "${title}"`);
        console.log(`  Assigned to: "${person.name}"`);
        console.log(`  Person ID: ${person.id}`);
        
        // Test the matching logic
        if (person.name.includes('Samuel') || person.name.includes('Robertson')) {
          console.log(`  ✅ Would match SAM`);
        } else if (person.name.includes('Robert') || person.name.includes('Schok')) {
          console.log(`  ✅ Would match ROB`);
        } else if (person.name.includes('Anna') || person.name.includes('Schuster')) {
          console.log(`  ✅ Would match ANNA`);
        } else {
          console.log(`  ❌ Would NOT match anyone - defaults to: ${person.name.split(' ')[0].toUpperCase()}`);
        }
        console.log('');
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugSamTask();