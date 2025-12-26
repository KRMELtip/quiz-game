module.exports = (req, res) => {
  res.json({
    message: 'Vercel Serverless Function работает!',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version
  });
};