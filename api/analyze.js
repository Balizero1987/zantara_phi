const PHI = 1.618033988749895;

// Complete analysis combining all golden modules
function analyze(text) {
  // Text splitting
  const sections = text.split(/\n\s*\n/).filter(s => s.trim()).slice(0, 7);
  const fibRatios = [0.382, 0.618, 0.786, 0.854, 0.91, 0.944, 0.967];

  const splitResult = sections.map((content, i) => ({
    index: i + 1,
    content: content.trim(),
    ratio: fibRatios[i] || 1.0,
    importance: Math.pow(PHI, -(i + 1))
  }));

  // Keywords
  const stopWords = new Set(['il', 'la', 'di', 'che', 'e', 'a', 'un', 'per', 'con', 'da', 'su', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  const words = text.toLowerCase().match(/\b[a-zàèéìòù]+\b/g) || [];
  const wordCount = {};

  words.forEach(word => {
    if (word.length > 2 && !stopWords.has(word)) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });

  const keywords = Object.entries(wordCount)
    .map(([word, freq]) => ({
      keyword: word,
      frequency: freq,
      score: (freq / words.length) * PHI
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // Classification
  const patterns = {
    invoice: /invoice|bill|total|amount|due|payment|€|\$|£/i,
    email: /subject:|from:|to:|email|@/i,
    contract: /agreement|contract|terms|conditions/i,
    report: /report|analysis|summary|findings/i,
    letter: /dear|sincerely|regards|yours/i
  };

  let bestType = 'letter';
  let maxScore = 0;

  Object.entries(patterns).forEach(([type, pattern]) => {
    const matches = (text.match(pattern) || []).length;
    if (matches > maxScore) {
      maxScore = matches;
      bestType = type;
    }
  });

  // Golden ratio metrics
  const goldenRatio = sections.length > 0 ? fibRatios[sections.length - 1] || 1 : 0;
  const complexity = Math.min(keywords.length / 10, 1);
  const confidence = Math.min(maxScore / 5, 1);

  return {
    sections: splitResult,
    keywords: keywords,
    classification: {
      type: bestType,
      confidence: confidence
    },
    summary: {
      goldenRatio: goldenRatio,
      complexity: complexity,
      confidence: confidence,
      sectionsCount: sections.length,
      keywordsCount: keywords.length
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
    const result = analyze(text);
    res.status(200).json({
      success: true,
      service: 'golden.analyze',
      data: result,
      phi: PHI,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};