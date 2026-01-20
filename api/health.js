// Simple health check endpoint for Vercel
module.exports = (req, res) => {
  res.status(200).json({
    status: 'healthy',
    platform: 'vercel',
    timestamp: new Date().toISOString(),
    message: 'Notion-Slack automation is running',
    method: req.method,
    url: req.url
  });
};