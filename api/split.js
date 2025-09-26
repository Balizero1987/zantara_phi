const PHI = 1.618033988749895;

// Golden Text Splitter (simplified for Vercel)
function goldenSplit(text, maxSections = 7) {
  const sections = text.split(/\n\s*\n/).filter(s => s.trim());
  const fibRatios = [0.382, 0.618, 0.786, 0.854, 0.91, 0.944, 0.967];

  return sections.slice(0, maxSections).map((content, i) => ({
    index: i + 1,
    content: content.trim(),
    ratio: fibRatios[i] || 1.0,
    importance: Math.pow(PHI, -(i + 1)),
    goldenScore: (fibRatios[i] || 1.0) * Math.pow(PHI, -(i + 1))
  }));
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, maxSections } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: 'Text required' });
  }

  try {
    const result = goldenSplit(text, maxSections);
    res.status(200).json({
      success: true,
      service: 'golden.split',
      data: result,
      phi: PHI,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};