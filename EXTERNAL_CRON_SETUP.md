# External Cron Setup - Reliable Alternative to Railway Cron

## Problem with Railway
Railway's cron jobs are unreliable and often stop working. Your tasks haven't updated in 26+ hours because the cron jobs aren't running.

## Solution: External Cron Service + Webhooks

### Step 1: Deploy Webhook-Only Server
1. Update Railway to use `server-webhook-only.js` instead of `server-simple.js`
2. This removes unreliable cron jobs and uses webhook triggers instead

### Step 2: Set Up External Cron (Free)
Use **cron-job.org** (free service) to trigger your Railway webhooks:

#### Go to: https://cron-job.org/en/
1. Create free account
2. Add these cron jobs:

**Job 1: Check Completed Tasks (Every 3 minutes)**
- URL: `https://notion-slack-automation-production.up.railway.app/trigger/check-completed`
- Method: POST
- Schedule: `*/3 * * * *`
- Title: "Check Completed Tasks"

**Job 2: Check New Tasks (Every 5 minutes)**
- URL: `https://notion-slack-automation-production.up.railway.app/trigger/check-new`
- Method: POST
- Schedule: `*/5 * * * *`
- Title: "Check New Tasks"

**Job 3: Daily Cleanup (6 AM EST)**
- URL: `https://notion-slack-automation-production.up.railway.app/trigger/cleanup`
- Method: POST
- Schedule: `0 11 * * *` (6 AM EST = 11 AM UTC)
- Title: "Daily Cleanup 6 AM"

**Job 4: Daily Cleanup (9:30 AM EST)**
- URL: `https://notion-slack-automation-production.up.railway.app/trigger/cleanup`
- Method: POST
- Schedule: `30 14 * * *` (9:30 AM EST = 2:30 PM UTC)
- Title: "Daily Cleanup 9:30 AM"

**Job 5: Daily Cleanup (9:45 AM EST)**
- URL: `https://notion-slack-automation-production.up.railway.app/trigger/cleanup`
- Method: POST
- Schedule: `45 14 * * *`
- Title: "Daily Cleanup 9:45 AM"

**Job 6: Daily Cleanup (1 PM EST)**
- URL: `https://notion-slack-automation-production.up.railway.app/trigger/cleanup`
- Method: POST
- Schedule: `0 18 * * *`
- Title: "Daily Cleanup 1 PM"

**Job 7: Full Sync (Every 2 hours, 6 AM - 10 PM EST)**
- URL: `https://notion-slack-automation-production.up.railway.app/trigger/sync`
- Method: POST
- Schedule: `0 11,13,15,17,19,21,23,1,3 * * *` (6 AM - 10 PM EST)
- Title: "Full Task Sync"

### Step 3: Update Railway Deployment
Change Railway's start command from `server-simple.js` to `server-webhook-only.js`

### Benefits of This Approach:
✅ **Reliable**: External cron services are designed for this
✅ **Free**: cron-job.org is free for basic usage
✅ **Monitoring**: You can see if jobs succeed/fail
✅ **Flexible**: Easy to adjust schedules
✅ **Railway-friendly**: Railway just handles webhooks (what it's good at)

### Manual Triggers (Backup):
If external cron fails, you can manually trigger:
```bash
curl -X POST https://notion-slack-automation-production.up.railway.app/trigger/sync
curl -X POST https://notion-slack-automation-production.up.railway.app/trigger/check-completed
curl -X POST https://notion-slack-automation-production.up.railway.app/trigger/check-new
curl -X POST https://notion-slack-automation-production.up.railway.app/trigger/cleanup
```

Or use Slack command: `/sync-tasks`

This approach is **much more reliable** than Railway's built-in cron system.