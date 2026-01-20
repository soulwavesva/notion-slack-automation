// Simple test endpoint
module.exports = (req, res) => {
  res.status(200).json({
    message: 'API endpoint is working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
};