# Notion-Slack Task Automation

Automatically sync overdue tasks from Notion to Slack with interactive "Done" buttons.

## Features

- 📋 Fetches overdue AND due-today tasks from your Notion database (most overdue first)
- 💬 Posts up to 3 tasks at a time to Slack with "Done" buttons
- ✅ Marks tasks as CHECKED in Notion when you click "Done"
- 🔄 Automatically posts the next task when one is completed
- ⚡ **REAL-TIME**: Monitors for new tasks every minute and posts them immediately
- ⏰ Runs on a schedule from 6 AM - 10 PM EST, Monday through Sunday
- 🎯 Manual triggers: `/post-tasks` and `/check-new` Slack commands

## Setup Instructions

### 1. Prerequisites

You'll need:
- A Notion database with:
  - Checkbox property (name it "Done")
  - Date property (name it "Due Date")
  - Title property for task names
- A Slack workspace where you can create apps
- Node.js installed on your computer

### 2. Notion Setup

1. Create a Notion integration:
   - Go to https://www.notion.so/my-integrations
   - Click "New integration"
   - Give it a name like "Task Bot"
   - Copy the "Internal Integration Token"

2. Share your database with the integration:
   - Open your Notion database
   - Click "Share" → "Invite"
   - Search for your integration name and invite it

3. Get your database ID:
   - Open your database in Notion
   - Copy the URL - the database ID is the long string after the last slash

### 3. Slack Setup

1. Create a Slack App:
   - Go to https://api.slack.com/apps
   - Click "Create New App" → "From scratch"
   - Name it "Task Bot" and select your workspace

2. Configure Bot Token:
   - Go to "OAuth & Permissions"
   - Add these scopes under "Bot Token Scopes":
     - `chat:write`
     - `chat:delete`
     - `commands`
   - Install the app to your workspace
   - Copy the "Bot User OAuth Token"

3. Enable Interactivity:
   - Go to "Interactivity & Shortcuts"
   - Turn on "Interactivity"
   - Set Request URL to: `https://your-domain.com/slack/events`
   - (You'll update this after deployment)

4. Add Slash Command:
   - Go to "Slash Commands"
   - Create command `/post-tasks`
   - Set Request URL to: `https://your-domain.com/slack/events`

5. Get Signing Secret:
   - Go to "Basic Information"
   - Copy the "Signing Secret"

6. Get Channel ID:
   - Right-click on your Slack channel
   - Select "Copy link"
   - The channel ID is at the end of the URL

### 4. Installation

1. Clone or download this project
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Create environment file:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

4. Fill in your `.env` file with the tokens and IDs from above

### 5. Running the Bot

**Development:**
\`\`\`bash
npm run dev
\`\`\`

**Production:**
\`\`\`bash
npm start
\`\`\`

**Manual task posting:**
\`\`\`bash
npm run post-tasks
\`\`\`

### 6. Deployment

For production, deploy to a service like:
- Heroku
- Railway
- DigitalOcean App Platform
- AWS/GCP/Azure

Make sure to:
1. Set all environment variables
2. Update your Slack app's Request URLs to your deployed domain
3. Ensure the server stays running

## Deployment: Railway

1. Push this repository to a Git provider (GitHub/GitLab).
2. In Railway, create a new Project → Deploy from GitHub and pick this repo.
3. In Railway Project Settings add the environment variables:
   - NOTION_API_KEY
   - NOTION_DATABASE_ID
   - SLACK_BOT_TOKEN
   - SLACK_SIGNING_SECRET
   - SLACK_CHANNEL_ID
   - (OPTIONAL) PORT — Railway sets one automatically if omitted
4. Railway will run `npm start` (server.js). Ensure package.json "start" uses server.js.
5. After deployment update:
   - Slack Interactivity / Slash Commands Request URL: https://<your-railway-domain>/slack/events
   - Notion webhook URL (if used): https://<your-railway-domain>/notion/webhook
6. Use Railway logs to troubleshoot and test with `/post-tasks` or the included test scripts.

Quick deploy commands (local):
```bash
git add .
git commit -m "Add Railway deploy docs and Procfile"
git push origin main
```

Notes:
- Make sure the Slack app has scopes: `chat:write`, `chat:delete`, `commands`, and is installed in the workspace.
- Ensure the Notion integration is shared with the database and NOTION_DATABASE_ID is correct.

## How It Works

1. **Real-time Monitoring**: Every minute, the bot checks for new tasks in Notion
2. **Immediate Posting**: New urgent tasks (due today or overdue) are posted to Slack instantly
3. **Scheduled Check**: Every hour from 6 AM - 10 PM EST (Mon-Sun), the bot also does a full check
4. **Mark Complete**: When you click "Done", the task checkbox is CHECKED in Notion and removed from Slack
5. **Next Task**: The next overdue/due task (if any) is automatically posted

## Troubleshooting

**Bot not responding:**
- Check that all environment variables are set correctly
- Verify Slack app permissions and installation
- Check server logs for errors

**Tasks not fetching:**
- Verify Notion integration has access to your database
- Check that property names match ("Done", "Due Date")
- Ensure database ID is correct

**Buttons not working:**
- Verify Slack Interactivity URL is correct
- Check Signing Secret is set properly
- Ensure server is publicly accessible

## Customization

You can modify:
- Task limit (change `maxActiveTasks` in `task-manager.js`)
- Schedule (edit cron pattern in `server.js`)
- Message format (update `slack.js`)
- Notion property names (modify `notion.js`)

## Support

Check the logs for detailed error messages:
\`\`\`bash
# View logs in development
npm run dev

# View logs in production
pm2 logs  # if using PM2
heroku logs --tail  # if using Heroku
\`\`\`