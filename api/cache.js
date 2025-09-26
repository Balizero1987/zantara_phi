const PHI = 1.618033988749895;

// Simple in-memory cache for Vercel (stateless between requests)
const globalStats = {
  hits: 0,
  misses: 0,
  operations: 0,
  startTime: new Date().toISOString()
};

function getCacheStats() {
  const uptime = Date.now() - new Date(globalStats.startTime).getTime();
  const totalRequests = globalStats.hits + globalStats.misses;
  const hitRate = totalRequests > 0 ? globalStats.hits / totalRequests : 0;

  // Golden ratio calculations
  const goldenScore = hitRate * PHI;
  const efficiency = Math.min(goldenScore, 1);

  // Fibonacci-based performance rating
  const fibNumbers = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
  const performanceLevel = fibNumbers[Math.floor(hitRate * 10)] || 1;

  return {
    cache: {
      hits: globalStats.hits,
      misses: globalStats.misses,
      hitRate: Math.round(hitRate * 10000) / 100, // Percentage with 2 decimals
      operations: globalStats.operations,
      efficiency: Math.round(efficiency * 10000) / 100
    },
    golden: {
      phi: PHI,
      goldenScore: Math.round(goldenScore * 10000) / 10000,
      performanceLevel: performanceLevel,
      fibonacciIndex: Math.floor(hitRate * 10)
    },
    system: {
      uptime: Math.round(uptime / 1000), // seconds
      startTime: globalStats.startTime,
      timestamp: new Date().toISOString()
    },
    recommendations: getGoldenRecommendations(hitRate, efficiency)
  };
}

function getGoldenRecommendations(hitRate, efficiency) {
  const recommendations = [];

  if (hitRate < 0.382) { // Below golden ratio threshold
    recommendations.push("Increase cache TTL to improve hit rate");
  }

  if (hitRate > 0.618) { // Above golden ratio
    recommendations.push("Excellent cache performance - maintain current strategy");
  }

  if (efficiency < 0.5) {
    recommendations.push("Consider implementing cache warming strategies");
  }

  if (recommendations.length === 0) {
    recommendations.push("Cache operating within golden ratio parameters");
  }

  return recommendations;
}

// Simulate some cache activity for demo
function simulateCacheActivity() {
  // Random cache hits/misses based on golden ratio
  const shouldHit = Math.random() < 0.618; // Golden ratio probability

  if (shouldHit) {
    globalStats.hits++;
  } else {
    globalStats.misses++;
  }

  globalStats.operations++;
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Simulate cache activity for each request
  simulateCacheActivity();

  try {
    const stats = getCacheStats();

    res.status(200).json({
      success: true,
      service: 'golden.cache',
      data: stats,
      phi: PHI,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};