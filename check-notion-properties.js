require('dotenv').config();
const { Client } = require('@notionhq/client');

async function checkProperties() {
  try {
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });
    
    console.log('🔍 Checking Notion database properties...\n');
    
    const database = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID
    });
    
    console.log('=== ALL PROPERTIES ===');
    Object.entries(database.properties).forEach(([name, property]) => {
      console.log(`- "${name}" (${property.type})`);
    });
    
    console.log('\n=== PEOPLE PROPERTIES ===');
    Object.entries(database.properties).forEach(([name, property]) => {
      if (property.type === 'people') {
        console.log(`✅ Found people property: "${name}"`);
      }
    });
    
    // Get a sample task to see the actual data
    console.log('\n=== SAMPLE TASK DATA ===');
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      page_size: 1
    });
    
    if (response.results.length > 0) {
      const page = response.results[0];
      console.log('Sample task properties:');
      Object.entries(page.properties).forEach(([name, property]) => {
        if (property.type === 'people' && property.people.length > 0) {
          console.log(`\n"${name}" property:`);
          property.people.forEach(person => {
            console.log(`  - Name: ${person.name}`);
            console.log(`  - ID: ${person.id}`);
          });
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkProperties();