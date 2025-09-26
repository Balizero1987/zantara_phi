/**
 * Vercel API Routes for ZANTARA PHI
 * Serverless functions exposing golden services
 */

import { phiCoordinator } from '../coordination/phi-coordinator.js';

export interface VercelRequest {
  method: string;
  body: any;
  query: any;
  headers: any;
}

export interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: any) => VercelResponse;
  setHeader: (name: string, value: string) => VercelResponse;
  end: (data?: any) => void;
}

/**
 * CORS headers for Vercel
 */
const setCorsHeaders = (res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
};

/**
 * Handle preflight requests
 */
const handleOptions = (res: VercelResponse) => {
  setCorsHeaders(res).status(200).end();
};

/**
 * Generic API handler wrapper
 */
const apiHandler = (handler: (body: any, query: any) => Promise<any>) => {
  return async (req: VercelRequest, res: VercelResponse) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      return handleOptions(res);
    }

    try {
      const result = await handler(req.body || {}, req.query || {});
      return res.status(result.status || 200).json(result.body || result);
    } catch (error) {
      console.error('API Error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
};

/**
 * API Routes
 */

// GET /api/manifest
export const manifest = apiHandler(async () => {
  const manifest = phiCoordinator.getServiceManifest();
  return { status: 200, body: manifest };
});

// GET /api/coordination
export const coordination = apiHandler(async () => {
  const state = await phiCoordinator.getCoordinationState();
  return { status: 200, body: state };
});

// POST /api/golden/split
export const goldenSplit = apiHandler(async (body) => {
  const { text, options } = body;
  if (!text) {
    return { status: 400, body: { error: 'text parameter required' } };
  }
  const result = await phiCoordinator.executeGoldenSplit(text, options);
  return { status: 200, body: result };
});

// POST /api/golden/keywords
export const goldenKeywords = apiHandler(async (body) => {
  const { text, maxKeywords = 10 } = body;
  if (!text) {
    return { status: 400, body: { error: 'text parameter required' } };
  }
  const result = await phiCoordinator.executeGoldenKeywords(text, maxKeywords);
  return { status: 200, body: result };
});

// POST /api/golden/patterns
export const goldenPatterns = apiHandler(async (body) => {
  const { text, recursive = false } = body;
  if (!text) {
    return { status: 400, body: { error: 'text parameter required' } };
  }
  const result = await phiCoordinator.executeGoldenPatterns(text, recursive);
  return { status: 200, body: result };
});

// POST /api/golden/classify
export const goldenClassify = apiHandler(async (body) => {
  const { text } = body;
  if (!text) {
    return { status: 400, body: { error: 'text parameter required' } };
  }
  const result = await phiCoordinator.executeGoldenClassify(text);
  return { status: 200, body: result };
});

// POST /api/golden/analyze
export const goldenAnalyze = apiHandler(async (body) => {
  const { text, partial } = body;
  if (!text) {
    return { status: 400, body: { error: 'text parameter required' } };
  }
  const result = await phiCoordinator.executeGoldenPipeline(text, { partial });
  return { status: 200, body: result };
});

// GET /api/health
export const health = apiHandler(async () => {
  const state = await phiCoordinator.getCoordinationState();

  return {
    status: 200,
    body: {
      status: 'healthy',
      service: 'zantara-phi',
      version: 'φ-1.0.0',
      philosophy: 'φ = 1.618033988749895',
      mode: state.mode,
      bridgeAvailable: state.bridgeStatus.available,
      services: Object.keys(state.phiServices.services).length,
      deterministic: true,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  };
});

/**
 * Default export for Vercel compatibility
 */
export default {
  manifest,
  coordination,
  goldenSplit,
  goldenKeywords,
  goldenPatterns,
  goldenClassify,
  goldenAnalyze,
  health
};