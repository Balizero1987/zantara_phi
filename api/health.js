const PHI = 1.618033988749895;

module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.status(200).json({
    success: true,
    phi: PHI,
    status: 'healthy',
    services: [
      'golden.split',
      'golden.keywords',
      'golden.patterns',
      'golden.classify',
      'golden.analyze'
    ],
    timestamp: new Date().toISOString()
  });
};