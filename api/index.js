// Main index endpoint for Vercel
module.exports = (req, res) => {
  res.status(200).json({
    message: 'Notion-Slack Task Automation',
    status: 'running',
    platform: 'vercel',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      apiHealth: '/api/health',
      sync: '/trigger/sync',
      dailyCron: '/api/cron/daily-sync'
    }
  });
};