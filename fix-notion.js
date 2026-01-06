require('dotenv').config();
const { Client } = require('@notionhq/client');

async function fixNotion() {
  console.log('🔧 Diagnosing Notion connection...');
  
  // Check environment variables
  console.log('API Key length:', process.env.NOTION_API_KEY?.length || 'MISSING');
  console.log('API Key starts with:', process.env.NOTION_API_KEY?.substring(0, 10) || 'MISSING');
  console.log('Database ID:', process.env.NOTION_DATABASE_ID || 'MISSING');
  
  if (!process.env.NOTION_API_KEY) {
    console.log('❌ NOTION_API_KEY is missing from .env file');
    return;
  }
  
  if (!process.env.NOTION_DATABASE_ID) {
    console.log('❌ NOTION_DATABASE_ID is missing from .env file');
    return;
  }
  
  // Test the API key
  try {
    const notion = new Client({
      auth: process.env.NOTION_API_KEY.trim(), // Remove any whitespace
    });
    
    console.log('🧪 Testing API key with simple request...');
    
    // Try to get user info first (simpler than database)
    const user = await notion.users.me();
    console.log('✅ API key works! User:', user.name || user.id);
    
    // Now try database
    console.log('🧪 Testing database access...');
    const database = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID
    });
    
    console.log('✅ Database access works!');
    console.log('Database title:', database.title[0]?.plain_text || 'No title');
    
    // Show properties
    console.log('\n📋 Database Properties:');
    Object.entries(database.properties).forEach(([name, property]) => {
      console.log(`- "${name}": ${property.type}`);
    });
    
  } catch (error) {
    console.error('❌ Notion API Error:');
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    
    if (error.code === 'unauthorized') {
      console.log('\n🔑 Token Issues:');
      console.log('1. Make sure you copied the COMPLETE token');
      console.log('2. Token should be 50+ characters long');
      console.log('3. Make sure integration has access to the database');
      console.log('4. Try creating a brand new integration');
    }
    
    if (error.code === 'object_not_found') {
      console.log('\n📋 Database Issues:');
      console.log('1. Check database ID is correct');
      console.log('2. Make sure integration is connected to this database');
    }
  }
}

fixNotion();