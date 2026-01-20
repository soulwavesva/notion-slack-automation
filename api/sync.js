// Simple manual sync endpoint for Vercel
module.exports = async (req, res) => {
  try {
    // For now, just return success to test the endpoint
    res.status(200).json({
      success: true,
      message: 'Sync endpoint is working - full sync coming soon',
      timestamp: new Date().toISOString(),
      platform: 'vercel',
      note: 'This will trigger the full Notion-Slack sync once services are loaded'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};