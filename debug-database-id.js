require('dotenv').config();

console.log('=== DATABASE ID DEBUG ===');
console.log('Raw NOTION_DATABASE_ID:', JSON.stringify(process.env.NOTION_DATABASE_ID));
console.log('Length:', process.env.NOTION_DATABASE_ID?.length);
console.log('Characters:', process.env.NOTION_DATABASE_ID?.split('').map((c, i) => `${i}: '${c}'`));

// Test if it's actually a valid database ID format
const dbId = process.env.NOTION_DATABASE_ID;
if (dbId) {
  console.log('Has hyphens:', dbId.includes('-'));
  console.log('Expected format (32 chars, no hyphens):', dbId.length === 32 && !dbId.includes('-'));
}

// Try to use it with Notion API
const { Client } = require('@notionhq/client');

async function testDatabaseId() {
  try {
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });
    
    console.log('\n=== TESTING DATABASE ACCESS ===');
    console.log('Attempting to query database...');
    
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      page_size: 1
    });
    
    console.log('✅ Database query successful!');
    console.log('Database title:', response.results[0]?.parent?.database_id);
    
  } catch (error) {
    console.error('❌ Database query failed:', error.message);
    console.error('Error code:', error.code);
  }
}

testDatabaseId();