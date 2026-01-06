require('dotenv').config();
const { Client } = require('@notionhq/client');

async function findCorrectDatabase() {
  try {
    console.log('🔍 Searching for the correct Task Board database...');
    
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });
    
    // Search for all databases
    const databases = await notion.search({
      filter: {
        property: 'object',
        value: 'database'
      }
    });
    
    console.log('\n📋 Found databases:');
    databases.results.forEach((db, index) => {
      const title = db.title?.[0]?.plain_text || 'Untitled';
      console.log(`${index + 1}. "${title}"`);
      console.log(`   ID: ${db.id}`);
      console.log(`   URL: ${db.url}`);
      console.log('');
    });
    
    // Try each database to see which one works
    console.log('🧪 Testing each database...');
    
    for (const db of databases.results) {
      const title = db.title?.[0]?.plain_text || 'Untitled';
      
      try {
        console.log(`\nTesting "${title}"...`);
        
        // Try to retrieve the database
        const dbInfo = await notion.databases.retrieve({
          database_id: db.id
        });
        
        console.log(`✅ "${title}" works!`);
        console.log('Properties:');
        Object.entries(dbInfo.properties).forEach(([name, property]) => {
          console.log(`  - "${name}": ${property.type}`);
        });
        
        // Check if it has the properties we need
        const hasCheckbox = Object.values(dbInfo.properties).some(p => p.type === 'checkbox');
        const hasDate = Object.values(dbInfo.properties).some(p => p.type === 'date');
        const hasTitle = Object.values(dbInfo.properties).some(p => p.type === 'title');
        
        if (hasCheckbox && hasDate && hasTitle) {
          console.log(`🎯 "${title}" has all required properties!`);
          console.log(`Use this ID: ${db.id}`);
        }
        
      } catch (error) {
        console.log(`❌ "${title}" failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findCorrectDatabase();