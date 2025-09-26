export const PHI = 1.618033988749895;

import { goldenSplit, GoldenSection } from './text-splitter';
import { GoldenKeywordExtractor, KeywordResult } from './keyword-extractor';
import { GoldenPatternMatcher, PatternMatch } from './pattern-matcher';
import { GoldenCache, GoldenCacheFactory } from './cache';

export type AnalysisResult = {
  input: {
    text: string;
    length: number;
    timestamp: number;
  };
  sections: GoldenSection[];
  keywords: KeywordResult[];
  patterns: PatternMatch[];
  summary: {
    goldenRatio: number;
    complexity: number;
    confidence: number;
    processingTime: number;
  };
  cache: {
    hits: number;
    misses: number;
    efficiency: number;
  };
};

export type PipelineOptions = {
  maxSections?: number;
  maxKeywords?: number;
  maxPatterns?: number;
  enableCache?: boolean;
  cacheBasePath?: string;
  patternDepth?: number;
  keywordMinLength?: number;
};

export class GoldenPipeline {
  private keywordExtractor: GoldenKeywordExtractor;
  private patternMatcher: GoldenPatternMatcher;
  private cache: {
    sections: GoldenCache<GoldenSection[]>;
    keywords: GoldenCache<KeywordResult[]>;
    patterns: GoldenCache<PatternMatch[]>;
  } | null;
  private readonly options: Required<PipelineOptions>;

  constructor(options: PipelineOptions = {}) {
    this.options = {
      maxSections: options.maxSections ?? Math.floor(PHI * 4), // ~6 sections
      maxKeywords: options.maxKeywords ?? Math.floor(PHI * 10), // ~16 keywords
      maxPatterns: options.maxPatterns ?? Math.floor(PHI * 5), // ~8 patterns
      enableCache: options.enableCache ?? true,
      cacheBasePath: options.cacheBasePath ?? '/tmp/golden-cache',
      patternDepth: options.patternDepth ?? 4,
      keywordMinLength: options.keywordMinLength ?? 3
    };

    // Inizializza moduli
    this.keywordExtractor = new GoldenKeywordExtractor({
      minWordLength: this.options.keywordMinLength,
      maxKeywords: this.options.maxKeywords
    });

    this.patternMatcher = new GoldenPatternMatcher({
      maxDepth: this.options.patternDepth,
      confidenceThreshold: 0.1
    });

    // Inizializza cache se abilitata
    if (this.options.enableCache) {
      this.cache = {
        sections: GoldenCacheFactory.createSplitCache(
          `${this.options.cacheBasePath}-sections.json`
        ),
        keywords: GoldenCacheFactory.createKeywordCache(
          `${this.options.cacheBasePath}-keywords.json`
        ),
        patterns: GoldenCacheFactory.createPatternCache(
          `${this.options.cacheBasePath}-patterns.json`
        )
      };
    } else {
      this.cache = null;
    }
  }

  /**
   * Analizza un testo attraverso tutti i moduli aurei
   */
  async analyze(text: string): Promise<AnalysisResult> {
    const startTime = Date.now();
    const textHash = this.hashText(text);

    let cacheStats = { hits: 0, misses: 0, efficiency: 0 };

    // 1. Text Splitting con cache
    const sections = await this.getSections(text, textHash, cacheStats);

    // 2. Keyword Extraction con cache
    const keywords = await this.getKeywords(text, textHash, cacheStats);

    // 3. Pattern Matching con cache
    const patterns = await this.getPatterns(text, textHash, cacheStats);

    // 4. Calcola metriche auree integrate
    const summary = this.calculateSummary(sections, keywords, patterns, startTime);

    // 5. Aggiorna cache efficiency
    const totalOperations = cacheStats.hits + cacheStats.misses;
    cacheStats.efficiency = totalOperations > 0
      ? Math.round((cacheStats.hits / totalOperations) * 10000) / 10000
      : 0;

    return {
      input: {
        text: text.slice(0, 200) + (text.length > 200 ? '...' : ''), // Preview
        length: text.length,
        timestamp: Date.now()
      },
      sections,
      keywords,
      patterns,
      summary,
      cache: cacheStats
    };
  }

  /**
   * Analizza solo le parti specificate (per performance)
   */
  async analyzePartial(
    text: string,
    parts: { sections?: boolean; keywords?: boolean; patterns?: boolean }
  ): Promise<Partial<AnalysisResult>> {
    const startTime = Date.now();
    const textHash = this.hashText(text);
    let cacheStats = { hits: 0, misses: 0, efficiency: 0 };

    const result: Partial<AnalysisResult> = {
      input: {
        text: text.slice(0, 200) + (text.length > 200 ? '...' : ''),
        length: text.length,
        timestamp: Date.now()
      }
    };

    if (parts.sections) {
      result.sections = await this.getSections(text, textHash, cacheStats);
    }

    if (parts.keywords) {
      result.keywords = await this.getKeywords(text, textHash, cacheStats);
    }

    if (parts.patterns) {
      result.patterns = await this.getPatterns(text, textHash, cacheStats);
    }

    // Calcola summary solo se abbiamo dati
    if (result.sections || result.keywords || result.patterns) {
      result.summary = this.calculateSummary(
        result.sections || [],
        result.keywords || [],
        result.patterns || [],
        startTime
      );
    }

    const totalOps = cacheStats.hits + cacheStats.misses;
    cacheStats.efficiency = totalOps > 0 ? cacheStats.hits / totalOps : 0;
    result.cache = cacheStats;

    return result;
  }

  /**
   * Ottiene le statistiche della pipeline
   */
  getStats(): {
    cache: { sections: any; keywords: any; patterns: any } | null;
    modules: { extractor: any; matcher: any };
  } {
    return {
      cache: this.cache ? {
        sections: this.cache.sections.getStats(),
        keywords: this.cache.keywords.getStats(),
        patterns: this.cache.patterns.getStats()
      } : null,
      modules: {
        extractor: { keywordMinLength: this.options.keywordMinLength },
        matcher: { maxDepth: this.options.patternDepth }
      }
    };
  }

  /**
   * Persiste tutte le cache su disco
   */
  async persistCaches(): Promise<void> {
    if (!this.cache) return;

    await Promise.all([
      this.cache.sections.persist(),
      this.cache.keywords.persist(),
      this.cache.patterns.persist()
    ]);
  }

  /**
   * Pulisce tutte le cache
   */
  clearCaches(): void {
    if (!this.cache) return;

    this.cache.sections.clear();
    this.cache.keywords.clear();
    this.cache.patterns.clear();
  }

  /**
   * Ottiene sezioni con cache
   */
  private async getSections(
    text: string,
    hash: string,
    stats: { hits: number; misses: number }
  ): Promise<GoldenSection[]> {
    const cacheKey = `sections:${hash}`;

    if (this.cache) {
      const cached = this.cache.sections.get(cacheKey);
      if (cached) {
        stats.hits++;
        return cached;
      }
    }

    // Calcola se non in cache
    const sections = goldenSplit(text, this.options.maxSections);

    if (this.cache) {
      this.cache.sections.set(cacheKey, sections);
      stats.misses++;
    }

    return sections;
  }

  /**
   * Ottiene keywords con cache
   */
  private async getKeywords(
    text: string,
    hash: string,
    stats: { hits: number; misses: number }
  ): Promise<KeywordResult[]> {
    const cacheKey = `keywords:${hash}:${this.options.maxKeywords}`;

    if (this.cache) {
      const cached = this.cache.keywords.get(cacheKey);
      if (cached) {
        stats.hits++;
        return cached;
      }
    }

    // Calcola se non in cache
    const keywords = this.keywordExtractor.extractKeywords(text, this.options.maxKeywords);

    if (this.cache) {
      this.cache.keywords.set(cacheKey, keywords);
      stats.misses++;
    }

    return keywords;
  }

  /**
   * Ottiene patterns con cache
   */
  private async getPatterns(
    text: string,
    hash: string,
    stats: { hits: number; misses: number }
  ): Promise<PatternMatch[]> {
    const cacheKey = `patterns:${hash}:${this.options.patternDepth}`;

    if (this.cache) {
      const cached = this.cache.patterns.get(cacheKey);
      if (cached) {
        stats.hits++;
        return cached;
      }
    }

    // Calcola se non in cache
    const patterns = this.patternMatcher.findPatterns(text);
    const limitedPatterns = patterns.slice(0, this.options.maxPatterns);

    if (this.cache) {
      this.cache.patterns.set(cacheKey, limitedPatterns);
      stats.misses++;
    }

    return limitedPatterns;
  }

  /**
   * Calcola metriche auree integrate
   */
  private calculateSummary(
    sections: GoldenSection[],
    keywords: KeywordResult[],
    patterns: PatternMatch[],
    startTime: number
  ) {
    const processingTime = Date.now() - startTime;

    // Golden ratio della distribuzione delle sezioni
    const sectionRatios = sections.map(s => s.ratio).sort((a, b) => b - a);
    let sectionGoldenRatio = 0;
    if (sectionRatios.length > 1) {
      for (let i = 1; i < sectionRatios.length; i++) {
        if (sectionRatios[i] > 0) {
          const ratio = sectionRatios[i - 1] / sectionRatios[i];
          const distance = Math.abs(ratio - PHI);
          sectionGoldenRatio += Math.max(0, 1 - distance);
        }
      }
      sectionGoldenRatio /= (sectionRatios.length - 1);
    }

    // Complexity basata su diversità e distribuzione
    const keywordScores = keywords.map(k => k.score);
    const patternScores = patterns.map(p => p.score);
    const allScores = [...keywordScores, ...patternScores];

    const complexity = allScores.length > 0
      ? Math.min(1.0, (allScores.reduce((a, b) => a + b, 0) / allScores.length) * PHI)
      : 0;

    // Confidence media pesata
    const keywordConfidence = keywords.reduce((sum, k) => sum + k.confidence, 0) / Math.max(1, keywords.length);
    const patternConfidence = patterns.reduce((sum, p) => sum + p.goldenRatio, 0) / Math.max(1, patterns.length);
    const confidence = (keywordConfidence * 0.618 + patternConfidence * 0.382); // Peso aureo

    return {
      goldenRatio: Math.round(sectionGoldenRatio * 10000) / 10000,
      complexity: Math.round(complexity * 10000) / 10000,
      confidence: Math.round(confidence * 10000) / 10000,
      processingTime
    };
  }

  /**
   * Crea hash deterministico del testo
   */
  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // Incorpora PHI per unicità
    const goldenHash = Math.abs(hash) * PHI;
    return Math.floor(goldenHash).toString(36);
  }
}

// --- CLI (solo quando eseguito via script npm con RUN_AS_CLI=1) ---
if (process.env.RUN_AS_CLI === '1') {
  (async () => {
    const fs = await import('node:fs/promises');
    const args = process.argv.slice(2);

    const command = args[0] || 'analyze';
    const filePath = args[1];
    const options = {
      json: args.includes('--json'),
      noCache: args.includes('--no-cache'),
      sections: args.includes('--sections-only'),
      keywords: args.includes('--keywords-only'),
      patterns: args.includes('--patterns-only')
    };

    if (!filePath && command === 'analyze') {
      console.log('Usage: npm run pipeline <file> [--json] [--no-cache] [--sections-only] [--keywords-only] [--patterns-only]');
      console.log('       npm run pipeline demo');
      console.log('       npm run pipeline stats');
      process.exit(1);
    }

    const pipeline = new GoldenPipeline({
      enableCache: !options.noCache,
      cacheBasePath: '/tmp/golden-pipeline'
    });

    try {
      switch (command) {
        case 'demo':
          console.log('🏛️ GOLDEN PIPELINE DEMO (φ = ' + PHI + ')\n');

          const demoText = `
Machine Learning e Intelligenza Artificiale sono tecnologie rivoluzionarie.
Il deep learning utilizza reti neurali per il pattern recognition.
Gli algoritmi di natural language processing analizzano grandi dataset.
Email: demo@example.com | Website: https://ai-research.com
Data: 15/03/2024 | Budget: $50,000 per il progetto AI-2024.
          `.trim();

          const demoResult = await pipeline.analyze(demoText);

          console.log('📊 ANALYSIS RESULTS:\n');
          console.log(`📝 Input: ${demoResult.input.length} chars`);
          console.log(`⚡ Processing: ${demoResult.summary.processingTime}ms`);
          console.log(`🔢 Sections: ${demoResult.sections.length}`);
          console.log(`🔑 Keywords: ${demoResult.keywords.length}`);
          console.log(`🔍 Patterns: ${demoResult.patterns.length}`);
          console.log(`📈 Golden Ratio: ${demoResult.summary.goldenRatio}`);
          console.log(`🧠 Complexity: ${demoResult.summary.complexity}`);
          console.log(`🎯 Confidence: ${demoResult.summary.confidence}`);
          console.log(`💾 Cache Efficiency: ${(demoResult.cache.efficiency * 100).toFixed(1)}%\n`);

          console.log('🏆 TOP KEYWORDS:');
          demoResult.keywords.slice(0, 3).forEach((kw, i) => {
            console.log(`   ${i + 1}. ${kw.keyword.padEnd(20)} score: ${kw.score.toFixed(3)}`);
          });

          console.log('\n🔍 TOP PATTERNS:');
          demoResult.patterns.slice(0, 3).forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.pattern.padEnd(20)} freq: ${p.frequency}`);
          });
          break;

        case 'stats':
          const stats = pipeline.getStats();
          console.log('📊 PIPELINE STATISTICS\n');

          if (stats.cache) {
            console.log('💾 CACHE STATS:');
            console.log(`   Sections: ${stats.cache.sections.totalEntries} entries, ${(stats.cache.sections.hitRate * 100).toFixed(1)}% hit rate`);
            console.log(`   Keywords: ${stats.cache.keywords.totalEntries} entries, ${(stats.cache.keywords.hitRate * 100).toFixed(1)}% hit rate`);
            console.log(`   Patterns: ${stats.cache.patterns.totalEntries} entries, ${(stats.cache.patterns.hitRate * 100).toFixed(1)}% hit rate`);
          } else {
            console.log('💾 Cache disabled');
          }

          console.log('\n🔧 MODULE CONFIG:');
          console.log(`   Keyword min length: ${stats.modules.extractor.keywordMinLength}`);
          console.log(`   Pattern max depth: ${stats.modules.matcher.maxDepth}`);
          break;

        case 'analyze':
        default:
          const text = await fs.readFile(filePath, 'utf8');

          let result;
          if (options.sections || options.keywords || options.patterns) {
            result = await pipeline.analyzePartial(text, {
              sections: options.sections,
              keywords: options.keywords,
              patterns: options.patterns
            });
          } else {
            result = await pipeline.analyze(text);
          }

          if (options.json) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            console.log(`\n🏛️ GOLDEN PIPELINE ANALYSIS (φ = ${PHI})\n`);
            console.log(`📄 File: ${filePath}`);
            console.log(`📏 Length: ${result.input?.length || 0} characters`);

            if (result.summary) {
              console.log(`⏱️  Time: ${result.summary.processingTime}ms`);
              console.log(`📊 Golden Ratio: ${result.summary.goldenRatio}`);
              console.log(`🧠 Complexity: ${result.summary.complexity}`);
              console.log(`🎯 Confidence: ${result.summary.confidence}`);
            }

            if (result.cache) {
              console.log(`💾 Cache Efficiency: ${(result.cache.efficiency * 100).toFixed(1)}%`);
            }

            if (result.sections?.length) {
              console.log(`\n📋 SECTIONS (${result.sections.length}):`);
              result.sections.forEach((section, i) => {
                const preview = section.content.replace(/\s+/g, ' ').slice(0, 60);
                console.log(`   ${i + 1}. ${preview}... (${(section.ratio * 100).toFixed(1)}%)`);
              });
            }

            if (result.keywords?.length) {
              console.log(`\n🔑 KEYWORDS (${result.keywords.length}):`);
              result.keywords.slice(0, 5).forEach((kw, i) => {
                console.log(`   ${i + 1}. ${kw.keyword.padEnd(20)} score: ${kw.score.toFixed(3)} freq: ${kw.frequency}`);
              });
            }

            if (result.patterns?.length) {
              console.log(`\n🔍 PATTERNS (${result.patterns.length}):`);
              result.patterns.slice(0, 5).forEach((p, i) => {
                console.log(`   ${i + 1}. ${p.pattern.padEnd(25)} freq: ${p.frequency} score: ${p.score.toFixed(3)}`);
              });
            }
          }
          break;
      }

      // Persisti cache prima di uscire
      await pipeline.persistCaches();

    } catch (error) {
      console.error('❌ Pipeline error:', error.message);
      process.exit(1);
    }
  })();
}