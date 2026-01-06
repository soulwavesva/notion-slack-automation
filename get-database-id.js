require('dotenv').config();
const { Client } = require('@notionhq/client');

async function getDatabaseId() {
  try {
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });
    
    console.log('🔍 Looking for databases...');
    
    // Get the page first
    const pageId = process.env.NOTION_DATABASE_ID;
    console.log('Checking page:', pageId);
    
    const page = await notion.pages.retrieve({
      page_id: pageId
    });
    
    console.log('✅ Found page:', page.properties?.title?.title?.[0]?.plain_text || 'Task Board');
    
    // Now search for databases
    const databases = await notion.search({
      filter: {
        property: 'object',
        value: 'database'
      }
    });
    
    console.log('\n📋 Found databases:');
    databases.results.forEach((db, index) => {
      const title = db.title?.[0]?.plain_text || 'Untitled';
      console.log(`${index + 1}. "${title}" - ID: ${db.id}`);
    });
    
    // Look for Task Board database
    const taskBoard = databases.results.find(db => {
      const title = db.title?.[0]?.plain_text || '';
      return title.toLowerCase().includes('task');
    });
    
    if (taskBoard) {
      console.log('\n🎯 Found Task Board database!');
      console.log('Database ID:', taskBoard.id);
      console.log('\nUpdate your .env file with:');
      console.log(`NOTION_DATABASE_ID=${taskBoard.id}`);
    } else {
      console.log('\n❌ No Task Board database found. Make sure it\'s shared with your integration.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getDatabaseId();