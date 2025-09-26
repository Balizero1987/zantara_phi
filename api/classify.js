const PHI = 1.618033988749895;

// Simplified document classifier for Vercel
function classify(text) {
  const types = ['invoice', 'email', 'contract', 'report', 'letter'];
  const patterns = {
    invoice: /invoice|bill|total|amount|due|payment|€|\$|£/i,
    email: /subject:|from:|to:|email|@/i,
    contract: /agreement|contract|terms|conditions|party|whereas/i,
    report: /report|analysis|summary|findings|conclusion/i,
    letter: /dear|sincerely|regards|yours|letter/i
  };

  const scores = {};
  let maxScore = 0;
  let bestType = 'letter';

  types.forEach((type, i) => {
    const matches = (text.match(patterns[type]) || []).length;
    const fibWeight = [1, 1, 2, 3, 5][i] || 1;
    scores[type] = matches * fibWeight * Math.pow(PHI, -i);

    if (scores[type] > maxScore) {
      maxScore = scores[type];
      bestType = type;
    }
  });

  const confidence = Math.min(maxScore / (text.length / 100), 1);

  return {
    type: bestType,
    confidence: confidence,
    scores: scores,
    goldenRatio: PHI
  };
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

  const { text } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: 'Text required' });
  }

  try {
    const result = classify(text);
    res.status(200).json({
      success: true,
      service: 'golden.classify',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};