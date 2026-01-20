// Simple health check endpoint for Vercel
export default function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    platform: 'vercel',
    timestamp: new Date().toISOString(),
    message: 'Notion-Slack automation is running'
  });
}