require('dotenv').config();
const { Client } = require('@notionhq/client');

async function testConnection() {
  try {
    console.log('🧪 Testing Notion connection...');
    
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });
    
    // Test 1: Check if API key works
    console.log('1. Testing API key...');
    const user = await notion.users.me();
    console.log('✅ API key works! User:', user.name || user.id);
    
    // Test 2: Try to access the specific database
    console.log('\n2. Testing database access...');
    console.log('Database ID:', process.env.NOTION_DATABASE_ID);
    
    const database = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID
    });
    
    console.log('✅ Database access works!');
    console.log('Database title:', database.title?.[0]?.plain_text || 'No title');
    
  } catch (error) {
    console.error('❌ Error:', error.code, '-', error.message);
    
    if (error.code === 'object_not_found') {
      console.log('\n💡 Solutions:');
      console.log('1. Make sure the database ID is correct');
      console.log('2. Make sure the integration has access to this database');
      console.log('3. Try sharing the database with the integration again');
    }
  }
}

testConnection();