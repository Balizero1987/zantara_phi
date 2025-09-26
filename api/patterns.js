const PHI = 1.618033988749895;

// Simplified pattern matcher for Vercel
function findPatterns(text) {
  const patterns = {
    emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    urls: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g,
    phones: /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    currencies: /[€$£¥₹]\s?\d+(?:[.,]\d{2})?|\d+(?:[.,]\d{2})?\s?[€$£¥₹]/g,
    dates: /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g,
    numbers: /\b\d+(?:[.,]\d+)?\b/g,
    uppercase: /\b[A-Z]{2,}\b/g,
    quotes: /"[^"]*"|'[^']*'/g
  };

  const results = [];
  let totalMatches = 0;

  Object.entries(patterns).forEach(([type, regex], index) => {
    const matches = [...text.matchAll(regex)];
    const frequency = matches.length;

    if (frequency > 0) {
      // Fibonacci scoring with golden ratio
      const fibWeights = [1, 1, 2, 3, 5, 8, 13, 21];
      const weight = fibWeights[index] || 1;
      const score = frequency * weight * Math.pow(PHI, -index);

      results.push({
        type: type,
        frequency: frequency,
        score: score,
        confidence: Math.min(score / 10, 1),
        matches: matches.slice(0, 5).map(m => m[0]), // First 5 matches
        goldenWeight: weight
      });

      totalMatches += frequency;
    }
  });

  // Sort by golden score
  results.sort((a, b) => b.score - a.score);

  // Calculate fractal dimension (simplified)
  const uniqueTypes = results.length;
  const fractalDim = uniqueTypes > 0 ? Math.log(totalMatches) / Math.log(uniqueTypes) : 0;

  return {
    patterns: results,
    summary: {
      totalMatches: totalMatches,
      uniqueTypes: uniqueTypes,
      fractalDimension: fractalDim,
      goldenRatio: PHI,
      complexity: Math.min(totalMatches / 50, 1)
    }
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
    const result = findPatterns(text);
    res.status(200).json({
      success: true,
      service: 'golden.patterns',
      data: result,
      phi: PHI,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};