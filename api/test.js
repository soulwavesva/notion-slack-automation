module.exports = function handler(req, res) {
  res.status(200).json({
    message: 'Hello World from Vercel!',
    timestamp: new Date().toISOString(),
    success: true
  });
};