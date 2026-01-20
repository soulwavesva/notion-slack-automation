# Vercel Setup Guide

## The Issue with Vercel Free Tier
Vercel's free tier only allows **daily cron jobs**, but we need frequent updates (every 3-5 minutes).

## Solution: Vercel + External Cron Service

### Step 1: Deploy to Vercel
1. Go to **https://vercel.com**
2. Sign up with your **GitHub account**
3. Click **"Add New..." → "Project"**
4. Select **`notion-slack-automation`** repo
5. Click **"Import"**

### Step 2: Add Environment Variables
In Vercel dashboard → Settings → Environment Variables, add:
- `NOTION_API_KEY` = (your Notion API key)
- `NOTION_DATABASE_ID` = (your Notion database ID)
- `SLACK_BOT_TOKEN` = (your Slack bot token)
- `SLACK_SIGNING_SECRET` = (your Slack signing secret)
- `SLACK_CHANNEL_ID` = (your Slack channel ID)
- `NODE_ENV` = `production`

### Step 3: Test Deployment
Visit your Vercel URL + `/health` to confirm it's working

### Step 4: Set Up External Cron (Free)
Since Vercel free tier only allows daily cron, use **cron-job.org**:

1. Go to: https://cron-job.org/en/
2. Create free account
3. Add these jobs:

**Every 3 minutes:**
- URL: `https://your-vercel-app.vercel.app/trigger/sync`
- Schedule: `*/3 * * * *`

**Every 5 minutes:**
- URL: `https://your-vercel-app.vercel.app/trigger/sync`  
- Schedule: `*/5 * * * *`

### Benefits:
✅ **Free hosting** (Vercel)
✅ **Free cron** (cron-job.org)
✅ **Reliable automation**
✅ **Total cost: $0/month**

### Manual Trigger:
Visit: `https://your-vercel-app.vercel.app/trigger/sync`

This gives you reliable, frequent automation for free!