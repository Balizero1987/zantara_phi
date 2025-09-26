import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoldenPipeline } from '../modules/golden/pipeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PHI = 1.618033988749895;
const PORT = process.env.PORT || 3000;

// Initialize pipeline
const pipeline = new GoldenPipeline({
  enableCache: true,
  cacheBasePath: '/tmp/golden-web-cache'
});

// MIME types
const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.txt': 'text/plain'
};

function getMimeType(filePath: string): string {
  const ext = filePath.substring(filePath.lastIndexOf('.'));
  return mimeTypes[ext] || 'application/octet-stream';
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

async function handleAnalyze(body: string) {
  try {
    const { text, options = {} } = JSON.parse(body);

    if (!text || typeof text !== 'string') {
      throw new Error('Text is required');
    }

    if (text.length > 50000) {
      throw new Error('Text too long (max 50KB)');
    }

    const result = await pipeline.analyze(text);

    return {
      success: true,
      data: result,
      timestamp: Date.now(),
      phi: PHI
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed',
      timestamp: Date.now()
    };
  }
}

async function handlePartialAnalyze(body: string) {
  try {
    const { text, parts = {} } = JSON.parse(body);

    if (!text || typeof text !== 'string') {
      throw new Error('Text is required');
    }

    const result = await pipeline.analyzePartial(text, parts);

    return {
      success: true,
      data: result,
      timestamp: Date.now(),
      phi: PHI
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed',
      timestamp: Date.now()
    };
  }
}

function handleStats() {
  const stats = pipeline.getStats();
  return {
    success: true,
    data: {
      ...stats,
      phi: PHI,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    },
    timestamp: Date.now()
  };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Set CORS headers
  Object.entries(corsHeaders()).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    // API Routes
    if (pathname.startsWith('/api/')) {
      res.setHeader('Content-Type', 'application/json');

      if (pathname === '/api/analyze' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const result = await handleAnalyze(body);
          res.writeHead(result.success ? 200 : 400);
          res.end(JSON.stringify(result, null, 2));
        });
        return;
      }

      if (pathname === '/api/analyze-partial' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          const result = await handlePartialAnalyze(body);
          res.writeHead(result.success ? 200 : 400);
          res.end(JSON.stringify(result, null, 2));
        });
        return;
      }

      if (pathname === '/api/stats' && req.method === 'GET') {
        const result = handleStats();
        res.writeHead(200);
        res.end(JSON.stringify(result, null, 2));
        return;
      }

      if (pathname === '/api/health' && req.method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          message: 'Golden Monastery API is running',
          phi: PHI,
          timestamp: Date.now()
        }, null, 2));
        return;
      }

      // API route not found
      res.writeHead(404);
      res.end(JSON.stringify({
        success: false,
        error: 'API endpoint not found',
        availableEndpoints: [
          'POST /api/analyze',
          'POST /api/analyze-partial',
          'GET /api/stats',
          'GET /api/health'
        ]
      }, null, 2));
      return;
    }

    // Static file serving
    let filePath = pathname === '/' ? '/dashboard.html' : pathname;
    filePath = join(__dirname, filePath);

    try {
      const fileContent = await readFile(filePath);
      const mimeType = getMimeType(filePath);

      res.setHeader('Content-Type', mimeType);
      res.writeHead(200);
      res.end(fileContent);
    } catch (fileError) {
      // If file not found, serve dashboard.html for SPA routing
      if (pathname !== '/dashboard.html') {
        try {
          const dashboardContent = await readFile(join(__dirname, 'dashboard.html'));
          res.setHeader('Content-Type', 'text/html');
          res.writeHead(200);
          res.end(dashboardContent);
          return;
        } catch {
          // Fall through to 404
        }
      }

      res.writeHead(404);
      res.end(`
        <html>
          <head><title>404 - Not Found</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 2rem; background: #1a1a1a; color: #f5f5f5;">
            <h1 style="color: #d4af37;">🏛️ ZANTARA PHI Monastery</h1>
            <h2>404 - File Not Found</h2>
            <p>φ = ${PHI}</p>
            <a href="/" style="color: #d4af37;">← Back to Dashboard</a>
          </body>
        </html>
      `);
    }

  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({
      success: false,
      error: 'Internal server error',
      timestamp: Date.now()
    }, null, 2));
  }
});

server.listen(PORT, () => {
  console.log(`
🏛️  ZANTARA PHI Monastery Dashboard Server

📡 Server running on: http://localhost:${PORT}
🌐 Dashboard: http://localhost:${PORT}/
📊 API Health: http://localhost:${PORT}/api/health
📈 API Stats: http://localhost:${PORT}/api/stats

φ = ${PHI}

Available API Endpoints:
  POST /api/analyze          - Full text analysis
  POST /api/analyze-partial  - Partial analysis (sections/keywords/patterns)
  GET  /api/stats           - Pipeline statistics
  GET  /api/health          - Health check

Press Ctrl+C to stop
  `);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🏛️ Shutting down Golden Monastery Dashboard...');

  try {
    await pipeline.persistCaches();
    console.log('💾 Cache persisted successfully');
  } catch (error) {
    console.error('❌ Cache persist error:', error);
  }

  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});

export { server };