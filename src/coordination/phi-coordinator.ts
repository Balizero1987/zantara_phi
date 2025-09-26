/**
 * ZANTARA PHI Coordinator
 * Exposes PHI services for external consumption (including Bridge)
 *
 * Philosophy: Share golden wisdom while maintaining independence
 */

import { goldenSplit } from '../modules/golden/text-splitter.js';
import { GoldenKeywordExtractor } from '../modules/golden/keyword-extractor.js';
import { GoldenPatternMatcher } from '../modules/golden/pattern-matcher.js';
import { GoldenDocumentClassifier } from '../modules/golden/document-classifier.js';
import { GoldenPipeline } from '../modules/golden/pipeline.js';
import { bridgeReader, type BridgeStatus } from './bridge-reader.js';

const PHI = 1.618033988749895;

export interface PhiServiceManifest {
  version: string;
  philosophy: string;
  services: {
    [key: string]: {
      endpoint: string;
      description: string;
      inputFormat: any;
      outputFormat: any;
      deterministic: boolean;
    };
  };
  bridgeCompatibility: boolean;
}

export interface CoordinationState {
  phiServices: PhiServiceManifest;
  bridgeStatus: BridgeStatus;
  mode: 'standalone' | 'coordinated' | 'hybrid';
  lastSync: string;
}

export class ZantaraPhiCoordinator {
  private pipeline: GoldenPipeline;
  private port: number;

  constructor(port: number = 3618) {
    this.pipeline = new GoldenPipeline();
    this.port = port;
  }

  /**
   * Generate service manifest for external consumption
   */
  getServiceManifest(): PhiServiceManifest {
    return {
      version: "φ-1.0.0",
      philosophy: "Deterministic algorithms based on golden ratio φ = 1.618033988749895",
      services: {
        "golden.split": {
          endpoint: `/api/golden/split`,
          description: "Text splitting using golden ratio proportions",
          inputFormat: { text: "string", options: "object?" },
          outputFormat: { sections: "GoldenSection[]", goldenRatio: "number" },
          deterministic: true
        },
        "golden.keywords": {
          endpoint: `/api/golden/keywords`,
          description: "Keyword extraction with TF-IDF + Fibonacci weighting",
          inputFormat: { text: "string", maxKeywords: "number?" },
          outputFormat: { keywords: "KeywordResult[]", confidence: "number" },
          deterministic: true
        },
        "golden.patterns": {
          endpoint: `/api/golden/patterns`,
          description: "Fractal pattern matching across 5 levels",
          inputFormat: { text: "string", recursive: "boolean?" },
          outputFormat: { patterns: "PatternMatch[]", fractalDimension: "number" },
          deterministic: true
        },
        "golden.classify": {
          endpoint: `/api/golden/classify`,
          description: "Document classification without ML",
          inputFormat: { text: "string" },
          outputFormat: { type: "string", confidence: "number", features: "object" },
          deterministic: true
        },
        "golden.pipeline": {
          endpoint: `/api/golden/analyze`,
          description: "Complete golden analysis pipeline",
          inputFormat: { text: "string", partial: "object?" },
          outputFormat: { sections: "array", keywords: "array", patterns: "array", summary: "object" },
          deterministic: true
        }
      },
      bridgeCompatibility: true
    };
  }

  /**
   * Execute golden text splitting
   */
  async executeGoldenSplit(text: string, options?: any) {
    const result = goldenSplit(text, options);
    return {
      success: true,
      service: "golden.split",
      philosophy: `φ = ${PHI}`,
      data: result,
      deterministic: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute golden keyword extraction
   */
  async executeGoldenKeywords(text: string, maxKeywords: number = 10) {
    const extractor = new GoldenKeywordExtractor();
    const result = extractor.extractKeywords(text, maxKeywords);
    return {
      success: true,
      service: "golden.keywords",
      philosophy: `TF-IDF + Fibonacci weighting`,
      data: result,
      deterministic: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute golden pattern matching
   */
  async executeGoldenPatterns(text: string, recursive: boolean = false) {
    const matcher = new GoldenPatternMatcher();
    const result = matcher.findPatterns(text);
    return {
      success: true,
      service: "golden.patterns",
      philosophy: `5-level fractal geometry`,
      data: result,
      deterministic: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute golden document classification
   */
  async executeGoldenClassify(text: string) {
    const classifier = new GoldenDocumentClassifier();
    const result = classifier.classify(text);
    return {
      success: true,
      service: "golden.classify",
      philosophy: `Deterministic pattern matching`,
      data: result,
      deterministic: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute complete golden pipeline
   */
  async executeGoldenPipeline(text: string, options?: { partial?: any }) {
    const result = await this.pipeline.analyze(text, options?.partial);
    return {
      success: true,
      service: "golden.pipeline",
      philosophy: `Complete φ analysis`,
      data: result,
      deterministic: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get current coordination state
   */
  async getCoordinationState(): Promise<CoordinationState> {
    const bridgeStatus = await bridgeReader.getHealthStatus();
    const phiServices = this.getServiceManifest();

    const mode = bridgeStatus.available
      ? (bridgeStatus.status === 'healthy' ? 'hybrid' : 'coordinated')
      : 'standalone';

    return {
      phiServices,
      bridgeStatus,
      mode,
      lastSync: new Date().toISOString()
    };
  }

  /**
   * Create API endpoint handlers for Express/Vercel
   */
  getApiHandlers() {
    return {
      // Service manifest
      'GET /api/manifest': async () => {
        return {
          status: 200,
          body: this.getServiceManifest()
        };
      },

      // Coordination status
      'GET /api/coordination': async () => {
        const state = await this.getCoordinationState();
        return {
          status: 200,
          body: state
        };
      },

      // Golden services
      'POST /api/golden/split': async (body: any) => {
        const { text, options } = body;
        if (!text) {
          return { status: 400, body: { error: 'text parameter required' } };
        }
        const result = await this.executeGoldenSplit(text, options);
        return { status: 200, body: result };
      },

      'POST /api/golden/keywords': async (body: any) => {
        const { text, maxKeywords = 10 } = body;
        if (!text) {
          return { status: 400, body: { error: 'text parameter required' } };
        }
        const result = await this.executeGoldenKeywords(text, maxKeywords);
        return { status: 200, body: result };
      },

      'POST /api/golden/patterns': async (body: any) => {
        const { text, recursive = false } = body;
        if (!text) {
          return { status: 400, body: { error: 'text parameter required' } };
        }
        const result = await this.executeGoldenPatterns(text, recursive);
        return { status: 200, body: result };
      },

      'POST /api/golden/classify': async (body: any) => {
        const { text } = body;
        if (!text) {
          return { status: 400, body: { error: 'text parameter required' } };
        }
        const result = await this.executeGoldenClassify(text);
        return { status: 200, body: result };
      },

      'POST /api/golden/analyze': async (body: any) => {
        const { text, partial } = body;
        if (!text) {
          return { status: 400, body: { error: 'text parameter required' } };
        }
        const result = await this.executeGoldenPipeline(text, { partial });
        return { status: 200, body: result };
      }
    };
  }

  /**
   * Start coordination monitoring
   */
  async startCoordination(): Promise<() => void> {
    console.log(`🏛️ ZANTARA PHI Coordinator starting on port ${this.port}`);
    console.log(`📜 Philosophy: φ = ${PHI} (Golden Ratio)`);

    const stopMonitoring = await bridgeReader.startMonitoring(60000); // Check Bridge every minute

    // Log initial coordination state
    const state = await this.getCoordinationState();
    console.log(`🎯 Coordination mode: ${state.mode.toUpperCase()}`);
    console.log(`🌉 Bridge status: ${state.bridgeStatus.status}`);
    console.log(`✨ PHI services: ${Object.keys(state.phiServices.services).length} available`);

    return stopMonitoring;
  }
}

/**
 * Singleton coordinator instance
 */
export const phiCoordinator = new ZantaraPhiCoordinator();

/**
 * CLI usage
 */
if (process.env.RUN_AS_CLI) {
  (async () => {
    console.log('🏛️ ZANTARA PHI Coordinator (φ = 1.618033988749895)');
    console.log('================================================');

    const state = await phiCoordinator.getCoordinationState();

    console.log('\n📊 COORDINATION STATE:');
    console.log(`   Mode: ${state.mode.toUpperCase()}`);
    console.log(`   Bridge: ${state.bridgeStatus.available ? '✅ Available' : '❌ Offline'}`);
    console.log(`   PHI Services: ${Object.keys(state.phiServices.services).length} ready`);

    console.log('\n🔮 PHI SERVICES AVAILABLE:');
    Object.entries(state.phiServices.services).forEach(([key, service]) => {
      console.log(`   ${key}: ${service.description}`);
      console.log(`     📍 ${service.endpoint}`);
      console.log(`     🎯 Deterministic: ${service.deterministic ? '✅' : '❌'}`);
    });

    console.log('\n🌉 BRIDGE COMPATIBILITY:');
    console.log(`   Compatible: ${state.phiServices.bridgeCompatibility ? '✅' : '❌'}`);
    console.log(`   Strategy: ${state.mode === 'standalone' ? 'Independent operation' : 'Coordinated services'}`);

    console.log('\n✨ GOLDEN PHILOSOPHY:');
    console.log(`   φ = ${PHI}`);
    console.log(`   Deterministic > Probabilistic`);
    console.log(`   Mathematics > Machine Learning`);
    console.log(`   Independence > Dependency`);
  })();
}