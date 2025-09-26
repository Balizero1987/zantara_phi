const PHI = 1.618033988749895;

// Simplified keyword extractor for Vercel
function extractKeywords(text, maxKeywords = 10) {
  const stopWords = new Set(['il', 'la', 'di', 'che', 'e', 'a', 'un', 'per', 'con', 'da', 'su', 'come', 'anche', 'non', 'ma', 'se', 'sono', 'del', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']);

  const words = text.toLowerCase()
    .match(/\b[a-zàèéìòù]+\b/g) || [];

  const wordCount = {};
  const totalWords = words.length;

  words.forEach(word => {
    if (word.length > 2 && !stopWords.has(word)) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });

  const keywords = Object.entries(wordCount)
    .map(([word, freq]) => {
      const tf = freq / totalWords;
      const fibWeight = [1, 1, 2, 3, 5, 8, 13][word.length] || 1;
      const score = tf * fibWeight * PHI;

      return {
        keyword: word,
        frequency: freq,
        score: score,
        confidence: Math.min(score, 1)
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxKeywords);

  return keywords;
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

  const { text, maxKeywords } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: 'Text required' });
  }

  try {
    const result = extractKeywords(text, maxKeywords);
    res.status(200).json({
      success: true,
      service: 'golden.keywords',
      data: result,
      phi: PHI,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};