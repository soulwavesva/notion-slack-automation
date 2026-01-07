require('dotenv').config();

console.log('=== RAILWAY DEBUG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);

// Check each environment variable
const requiredVars = [
  'NOTION_API_KEY',
  'NOTION_DATABASE_ID', 
  'SLACK_BOT_TOKEN',
  'SLACK_SIGNING_SECRET',
  'SLACK_CHANNEL_ID'
];

console.log('\n=== ENVIRONMENT VARIABLES ===');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`${varName}: SET (${value.substring(0, 10)}...)`);
  } else {
    console.log(`${varName}: ❌ MISSING`);
  }
});

// Try to initialize Slack app with better error handling
console.log('\n=== SLACK APP INITIALIZATION ===');
try {
  if (!process.env.SLACK_SIGNING_SECRET) {
    throw new Error('SLACK_SIGNING_SECRET is missing');
  }
  if (!process.env.SLACK_BOT_TOKEN) {
    throw new Error('SLACK_BOT_TOKEN is missing');
  }
  
  const { App } = require('@slack/bolt');
  
  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: false,
    port: process.env.PORT || 3000
  });
  
  console.log('✅ Slack app initialized successfully');
  
  // Start the app
  app.start().then(() => {
    console.log('🚀 App started successfully on port', process.env.PORT || 3000);
  }).catch(error => {
    console.error('❌ Failed to start app:', error.message);
  });
  
} catch (error) {
  console.error('❌ Failed to initialize Slack app:', error.message);
  process.exit(1);
}