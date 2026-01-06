require('dotenv').config();
const { Client } = require('@notionhq/client');

async function createSimpleDatabase() {
  try {
    console.log('🔧 Creating simple task database...');
    
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });
    
    // Create a simple database
    const database = await notion.databases.create({
      parent: {
        type: 'page_id',
        page_id: 'YOUR_PAGE_ID_HERE' // You'll need to create a page first
      },
      title: [
        {
          type: 'text',
          text: {
            content: 'Simple Tasks'
          }
        }
      ],
      properties: {
        'Task': {
          title: {}
        },
        'Due Date': {
          date: {}
        },
        'Done': {
          checkbox: {}
        }
      }
    });
    
    console.log('✅ Database created!');
    console.log('Database ID:', database.id);
    console.log('Update your .env file with this ID');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createSimpleDatabase();