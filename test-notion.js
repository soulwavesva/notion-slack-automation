require('dotenv').config();
const { NotionService } = require('./services/notion');

async function testNotion() {
  try {
    console.log('Testing Notion connection...');
    const notionService = new NotionService();
    const tasks = await notionService.getOverdueTasks();
    console.log(`✅ Notion works! Found ${tasks.length} tasks`);
    console.log('Tasks:', tasks);
  } catch (error) {
    console.error('❌ Notion error:', error.message);
  }
}

testNotion();