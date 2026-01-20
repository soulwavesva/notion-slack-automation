# Vercel Deployment Checklist - Complete Task List

## 🎯 **GOAL**: Deploy working Notion-Slack automation on Vercel with daily cron

## 📋 **CURRENT STATE ANALYSIS**
- ❌ Multiple failed Vercel deployments
- ✅ Railway version works (but cron unreliable)
- ✅ All services work locally
- ❌ Vercel API endpoints return 404/Cannot GET

## 🔍 **ROOT CAUSE ANALYSIS**
**Why Vercel deployments are failing:**
1. **Wrong file structure** - Mixing serverless + traditional server
2. **Dependency conflicts** - @slack/bolt vs @slack/web-api
3. **Build errors** - Node.js version mismatches
4. **Missing dependencies** - Services not found during build
5. **Incorrect vercel.json** - Wrong configuration format

## ✅ **STEP-BY-STEP DEPLOYMENT PLAN**

### **PHASE 1: Clean Slate** 
- [ ] 1.1 Remove ALL conflicting files
  - [ ] Delete `server-simple.js`, `server-vercel.js`, `server.js`
  - [ ] Delete all `/services` folder (conflicts with `/lib`)
  - [ ] Delete `ecosystem.config.js`, `Procfile` (Railway-specific)
  - [ ] Clean up root directory completely

- [ ] 1.2 Create minimal `package.json`
  - [ ] Only essential dependencies: `@notionhq/client`, `@slack/web-api`
  - [ ] Remove: `@slack/bolt`, `express`, `node-cron`, `dotenv`
  - [ ] Set Node.js version to exactly `18.x`
  - [ ] Remove all scripts except basic ones

- [ ] 1.3 Create minimal `vercel.json`
  - [ ] Start with NO cron jobs (add later)
  - [ ] Basic serverless function config only
  - [ ] Test deployment without cron first

### **PHASE 2: Basic API Structure**
- [ ] 2.1 Create ultra-simple test endpoint
  - [ ] `/api/test.js` - just return "Hello World"
  - [ ] No dependencies, no imports
  - [ ] Test deployment works

- [ ] 2.2 Add environment variable test
  - [ ] `/api/env-test.js` - check if env vars load
  - [ ] Test Notion/Slack tokens are accessible
  - [ ] Verify Vercel env var configuration

- [ ] 2.3 Test Notion connection
  - [ ] `/api/notion-test.js` - simple Notion API call
  - [ ] Just fetch database info, no complex logic
  - [ ] Verify Notion integration works

- [ ] 2.4 Test Slack connection  
  - [ ] `/api/slack-test.js` - simple Slack API call
  - [ ] Just post a test message
  - [ ] Verify Slack integration works

### **PHASE 3: Core Functionality**
- [ ] 3.1 Create inline services (no separate files)
  - [ ] Put NotionService class directly in sync endpoint
  - [ ] Put SlackService class directly in sync endpoint
  - [ ] Avoid file imports that might fail

- [ ] 3.2 Build minimal sync endpoint
  - [ ] `/api/sync.js` - fetch 1 task, post to Slack
  - [ ] No complex logic, no task management
  - [ ] Just prove the basic flow works

- [ ] 3.3 Add person assignment logic
  - [ ] Extend sync to handle ROB/SAM/ANNA mapping
  - [ ] Limit to 3 tasks per person
  - [ ] Test with real Notion data

- [ ] 3.4 Add task prioritization
  - [ ] Overdue vs upcoming logic
  - [ ] Proper emoji assignment
  - [ ] Sort by due date

### **PHASE 4: Advanced Features**
- [ ] 4.1 Add cron job (daily only)
  - [ ] Update `vercel.json` with single daily cron
  - [ ] `/api/cron-daily.js` endpoint
  - [ ] Test cron job triggers correctly

- [ ] 4.2 Add interactive buttons (if needed)
  - [ ] Slack webhook endpoint for Done buttons
  - [ ] Mark tasks complete in Notion
  - [ ] Handle button interactions

- [ ] 4.3 Add cleanup logic
  - [ ] Remove completed tasks from Slack
  - [ ] Handle stale messages
  - [ ] Sync state management

### **PHASE 5: Testing & Optimization**
- [ ] 5.1 End-to-end testing
  - [ ] Manual sync works
  - [ ] Daily cron works
  - [ ] Done buttons work
  - [ ] Person assignments correct

- [ ] 5.2 Error handling
  - [ ] Graceful API failures
  - [ ] Proper error messages
  - [ ] Logging for debugging

- [ ] 5.3 Performance optimization
  - [ ] Minimize function cold starts
  - [ ] Optimize API calls
  - [ ] Reduce memory usage

## 🚨 **CRITICAL SUCCESS FACTORS**

### **Vercel-Specific Requirements:**
1. **Serverless functions only** - No traditional server
2. **Each API file is independent** - No shared state
3. **Minimal dependencies** - Vercel has size limits
4. **Proper exports** - `module.exports = (req, res) => {}`
5. **Environment variables** - Must be set in Vercel dashboard

### **Common Pitfalls to Avoid:**
1. ❌ Don't mix serverless + traditional server files
2. ❌ Don't use complex file imports between functions
3. ❌ Don't start with cron jobs (add after basic API works)
4. ❌ Don't use @slack/bolt (use @slack/web-api only)
5. ❌ Don't assume file system persistence between calls

### **Testing Strategy:**
1. **Start simple** - Hello World endpoint first
2. **Add complexity gradually** - One feature at a time
3. **Test each phase** - Don't move to next until current works
4. **Use Vercel logs** - Check function logs for errors
5. **Manual testing** - Visit endpoints directly in browser

## 🎯 **SUCCESS CRITERIA**
- ✅ `/api/sync` returns JSON and posts tasks to Slack
- ✅ Daily cron job runs at midnight EST
- ✅ Tasks organized by person (ROB/SAM/ANNA)
- ✅ Proper priority handling (overdue/upcoming)
- ✅ $0/month cost (Vercel free tier)

## 📝 **NEXT IMMEDIATE ACTIONS**
1. **Execute Phase 1** - Clean slate approach
2. **Test basic deployment** - Simple hello world
3. **Add one feature at a time** - Systematic approach
4. **Document what works** - Build on successes

This systematic approach should finally get Vercel working properly! 🚀