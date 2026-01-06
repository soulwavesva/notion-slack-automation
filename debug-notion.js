require('dotenv').config();
const { Client } = require('@notionhq/client');

async function debugNotionDatabase() {
  try {
    console.log('🔍 Debugging Notion database structure...');
    
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });
    
    // First, let's get the database info to see all properties
    const database = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID
    });
    
    console.log('\n📋 Database Properties:');
    Object.entries(database.properties).forEach(([name, property]) => {
      console.log(`- "${name}": ${property.type}`);
    });
    
    // Now let's get some sample pages to see the data
    console.log('\n📄 Sample Pages:');
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      page_size: 3
    });
    
    response.results.forEach((page, index) => {
      console.log(`\nPage ${index + 1}:`);
      Object.entries(page.properties).forEach(([name, property]) => {
        if (property.type === 'title' && property.title.length > 0) {
          console.log(`  Title: "${property.title[0].plain_text}"`);
        } else if (property.type === 'checkbox') {
          console.log(`  Checkbox "${name}": ${property.checkbox}`);
        } else if (property.type === 'date') {
          console.log(`  Date "${name}": ${property.date?.start || 'null'}`);
        }
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugNotionDatabase();