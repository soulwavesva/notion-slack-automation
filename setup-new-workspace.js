// Temporary script to get your new workspace info
// Run this after you get your new Notion token

require('dotenv').config();
const { Client } = require('@notionhq/client');

async function getNewWorkspaceInfo() {
  console.log('🔍 Getting your new workspace information...\n');
  
  // You'll paste your NEW Notion token here
  const newNotionToken = 'PASTE_YOUR_NEW_NOTION_TOKEN_HERE';
  
  if (newNotionToken === 'PASTE_YOUR_NEW_NOTION_TOKEN_HERE') {
    console.log('❌ Please update this script with your new Notion token first!');
    return;
  }
  
  try {
    const notion = new Client({ auth: newNotionToken });
    
    // Get user info
    const user = await notion.users.me();
    console.log('✅ Notion connection works!');
    console.log('User:', user.name || user.id);
    
    // Find databases
    const databases = await notion.search({
      filter: { property: 'object', value: 'database' }
    });
    
    console.log('\n📋 Available databases:');
    databases.results.forEach((db, index) => {
      const title = db.title?.[0]?.plain_text || 'Untitled';
      console.log(`${index + 1}. "${title}" - ID: ${db.id}`);
    });
    
    // Look for Task Board
    const taskBoard = databases.results.find(db => {
      const title = db.title?.[0]?.plain_text || '';
      return title.toLowerCase().includes('task');
    });
    
    if (taskBoard) {
      console.log('\n🎯 Found Task Board!');
      console.log('Database ID:', taskBoard.id);
      
      // Check properties
      console.log('\n📋 Database Properties:');
      Object.entries(taskBoard.properties).forEach(([name, property]) => {
        console.log(`- "${name}": ${property.type}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getNewWorkspaceInfo();