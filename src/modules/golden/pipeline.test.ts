import { describe, it, expect, beforeEach } from 'vitest';
import { GoldenPipeline, PHI, AnalysisResult } from './pipeline';

const sampleText = `
Machine Learning e Intelligenza Artificiale stanno rivoluzionando il mondo.
Il deep learning utilizza reti neurali per il pattern recognition avanzato.
Gli algoritmi di natural language processing analizzano grandi dataset.

Contatti:
- Email: research@ai-lab.com
- Website: https://www.ai-research.org
- Data progetto: 15/03/2024
- Budget: $75,000 per sviluppo AI-2024

Marco Rossi e Luigi Verdi collaborano su progetti innovativi.
L'indirizzo IP del server è 192.168.1.100.
`;

const shortText = "Breve testo di prova per testing rapido.";

describe('GoldenPipeline', () => {
  let pipeline: GoldenPipeline;

  beforeEach(() => {
    pipeline = new GoldenPipeline({
      enableCache: false, // Disabilita cache per test deterministici
      maxSections: 5,
      maxKeywords: 10,
      maxPatterns: 8
    });
  });

  describe('Costruttore e configurazione', () => {
    it('crea istanza con parametri default', () => {
      const defaultPipeline = new GoldenPipeline();
      expect(defaultPipeline).toBeDefined();
    });

    it('accetta parametri di configurazione personalizzati', () => {
      const customPipeline = new GoldenPipeline({
        maxSections: 3,
        maxKeywords: 5,
        maxPatterns: 4,
        enableCache: true,
        patternDepth: 3
      });

      expect(customPipeline).toBeDefined();
    });

    it('usa valori basati su PHI per default', () => {
      const defaultPipeline = new GoldenPipeline();
      expect(PHI).toBeCloseTo(1.618033988749895, 10);
    });
  });

  describe('Analisi completa', () => {
    it('analizza testo completo con tutti i moduli', async () => {
      const result = await pipeline.analyze(sampleText);

      expect(result).toHaveProperty('input');
      expect(result).toHaveProperty('sections');
      expect(result).toHaveProperty('keywords');
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('cache');

      // Verifica input
      expect(result.input.length).toBe(sampleText.length);
      expect(result.input.timestamp).toBeGreaterThan(0);

      // Verifica che tutti i moduli abbiano prodotto risultati
      expect(result.sections.length).toBeGreaterThan(0);
      expect(result.keywords.length).toBeGreaterThan(0);
      expect(result.patterns.length).toBeGreaterThan(0);

      // Verifica summary
      expect(result.summary.goldenRatio).toBeGreaterThanOrEqual(0);
      expect(result.summary.complexity).toBeGreaterThanOrEqual(0);
      expect(result.summary.confidence).toBeGreaterThanOrEqual(0);
      expect(result.summary.processingTime).toBeGreaterThan(0);

      // Verifica cache stats (cache disabilitata in questo test)
      expect(result.cache.hits).toBeGreaterThanOrEqual(0);
      expect(result.cache.misses).toBeGreaterThanOrEqual(0);
      expect(result.cache.efficiency).toBeGreaterThanOrEqual(0);
    });

    it('rispetta i limiti configurati', async () => {
      const limitedPipeline = new GoldenPipeline({
        maxSections: 2,
        maxKeywords: 3,
        maxPatterns: 2,
        enableCache: false
      });

      const result = await limitedPipeline.analyze(sampleText);

      expect(result.sections.length).toBeLessThanOrEqual(2);
      expect(result.keywords.length).toBeLessThanOrEqual(3);
      expect(result.patterns.length).toBeLessThanOrEqual(2);
    });

    it('gestisce testo breve', async () => {
      const result = await pipeline.analyze(shortText);

      expect(result.sections.length).toBeGreaterThan(0);
      expect(result.summary.processingTime).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(result.summary.goldenRatio)).toBe(true);
    });

    it('gestisce testo vuoto', async () => {
      const result = await pipeline.analyze('');

      expect(result.sections.length).toBe(0);
      expect(result.keywords.length).toBe(0);
      expect(result.patterns.length).toBe(0);
      expect(result.summary.complexity).toBe(0);
    });
  });

  describe('Analisi parziale', () => {
    it('analizza solo sezioni quando richiesto', async () => {
      const result = await pipeline.analyzePartial(sampleText, { sections: true });

      expect(result.sections).toBeDefined();
      expect(result.sections!.length).toBeGreaterThan(0);
      expect(result.keywords).toBeUndefined();
      expect(result.patterns).toBeUndefined();
    });

    it('analizza solo keywords quando richiesto', async () => {
      const result = await pipeline.analyzePartial(sampleText, { keywords: true });

      expect(result.keywords).toBeDefined();
      expect(result.keywords!.length).toBeGreaterThan(0);
      expect(result.sections).toBeUndefined();
      expect(result.patterns).toBeUndefined();
    });

    it('analizza solo patterns quando richiesto', async () => {
      const result = await pipeline.analyzePartial(sampleText, { patterns: true });

      expect(result.patterns).toBeDefined();
      expect(result.patterns!.length).toBeGreaterThan(0);
      expect(result.sections).toBeUndefined();
      expect(result.keywords).toBeUndefined();
    });

    it('analizza combinazioni di moduli', async () => {
      const result = await pipeline.analyzePartial(sampleText, {
        sections: true,
        keywords: true
      });

      expect(result.sections).toBeDefined();
      expect(result.keywords).toBeDefined();
      expect(result.patterns).toBeUndefined();
    });

    it('calcola summary per analisi parziali', async () => {
      const result = await pipeline.analyzePartial(sampleText, { keywords: true });

      expect(result.summary).toBeDefined();
      expect(result.summary!.processingTime).toBeGreaterThan(0);
    });
  });

  describe('Cache management', () => {
    let cachedPipeline: GoldenPipeline;

    beforeEach(() => {
      cachedPipeline = new GoldenPipeline({
        enableCache: true,
        cacheBasePath: '/tmp/test-golden-cache'
      });
    });

    it('utilizza cache per risultati ripetuti', async () => {
      // Prima analisi - tutte miss
      const result1 = await cachedPipeline.analyze(sampleText);
      expect(result1.cache.misses).toBeGreaterThan(0);
      expect(result1.cache.hits).toBe(0);

      // Seconda analisi - dovrebbe usare cache
      const result2 = await cachedPipeline.analyze(sampleText);
      expect(result2.cache.hits).toBeGreaterThan(0);

      // I risultati dovrebbero essere identici
      expect(result1.sections).toEqual(result2.sections);
      expect(result1.keywords).toEqual(result2.keywords);
      expect(result1.patterns).toEqual(result2.patterns);
    });

    it('calcola efficiency della cache correttamente', async () => {
      await cachedPipeline.analyze(sampleText);
      const result = await cachedPipeline.analyze(sampleText);

      expect(result.cache.efficiency).toBeGreaterThan(0);
      expect(result.cache.efficiency).toBeLessThanOrEqual(1);
    });

    it('pulisce le cache', () => {
      cachedPipeline.clearCaches();
      // Non dovrebbe lanciare errori
      expect(true).toBe(true);
    });

    it('persiste le cache', async () => {
      await cachedPipeline.analyze(sampleText);
      await expect(cachedPipeline.persistCaches()).resolves.toBeUndefined();
    });
  });

  describe('Statistiche pipeline', () => {
    it('restituisce statistiche complete', () => {
      const stats = pipeline.getStats();

      expect(stats).toHaveProperty('cache');
      expect(stats).toHaveProperty('modules');
      expect(stats.modules).toHaveProperty('extractor');
      expect(stats.modules).toHaveProperty('matcher');
    });

    it('restituisce stats cache quando abilitata', () => {
      const cachedPipeline = new GoldenPipeline({ enableCache: true });
      const stats = cachedPipeline.getStats();

      expect(stats.cache).not.toBeNull();
      expect(stats.cache).toHaveProperty('sections');
      expect(stats.cache).toHaveProperty('keywords');
      expect(stats.cache).toHaveProperty('patterns');
    });

    it('restituisce null per cache quando disabilitata', () => {
      const stats = pipeline.getStats();
      expect(stats.cache).toBeNull();
    });
  });

  describe('Metriche auree integrate', () => {
    it('calcola golden ratio delle sezioni', async () => {
      const result = await pipeline.analyze(sampleText);

      expect(result.summary.goldenRatio).toBeGreaterThanOrEqual(0);
      expect(result.summary.goldenRatio).toBeLessThanOrEqual(1);
      expect(Number.isFinite(result.summary.goldenRatio)).toBe(true);
    });

    it('calcola complexity basata su diversità', async () => {
      const result = await pipeline.analyze(sampleText);

      expect(result.summary.complexity).toBeGreaterThanOrEqual(0);
      expect(result.summary.complexity).toBeLessThanOrEqual(1);
      expect(Number.isFinite(result.summary.complexity)).toBe(true);
    });

    it('calcola confidence pesata', async () => {
      const result = await pipeline.analyze(sampleText);

      expect(result.summary.confidence).toBeGreaterThanOrEqual(0);
      expect(result.summary.confidence).toBeLessThanOrEqual(1);
      expect(Number.isFinite(result.summary.confidence)).toBe(true);
    });

    it('registra processing time accurato', async () => {
      const start = Date.now();
      const result = await pipeline.analyze(sampleText);
      const elapsed = Date.now() - start;

      expect(result.summary.processingTime).toBeGreaterThan(0);
      expect(result.summary.processingTime).toBeLessThanOrEqual(elapsed + 10); // Margine di errore
    });
  });

  describe('Hash deterministico', () => {
    it('produce hash identici per testo identico', async () => {
      const result1 = await pipeline.analyze(sampleText);
      const result2 = await pipeline.analyze(sampleText);

      // I risultati dovrebbero essere identici (senza cache)
      expect(result1.sections).toEqual(result2.sections);
    });

    it('produce hash diversi per testo diverso', async () => {
      const result1 = await pipeline.analyze(sampleText);
      const result2 = await pipeline.analyze(shortText);

      // I risultati dovrebbero essere diversi
      expect(result1.sections).not.toEqual(result2.sections);
      expect(result1.keywords).not.toEqual(result2.keywords);
    });
  });

  describe('Performance', () => {
    it('completa analisi in tempo ragionevole', async () => {
      const start = Date.now();
      const result = await pipeline.analyze(sampleText);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000); // < 1 secondo
      expect(result.summary.processingTime).toBeLessThan(500); // < 500ms
    });

    it('gestisce testi lunghi efficientemente', async () => {
      const longText = sampleText.repeat(10);

      const start = Date.now();
      const result = await pipeline.analyze(longText);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(2000); // < 2 secondi anche per testo x10
      expect(result.sections.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('gestisce testo con solo spazi', async () => {
      const result = await pipeline.analyze('   \n\n   \t   ');

      expect(result.sections.length).toBe(0);
      expect(result.keywords.length).toBe(0);
      expect(result.patterns.length).toBe(0);
    });

    it('gestisce testo con caratteri speciali', async () => {
      const specialText = '🎯✅ Test con emoji e símböls ñ ç ü 中文 العربية';
      const result = await pipeline.analyze(specialText);

      expect(result.sections.length).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(result.summary.complexity)).toBe(true);
    });

    it('gestisce input molto brevi', async () => {
      const result = await pipeline.analyze('Hi');

      expect(result.input.length).toBe(2);
      expect(Number.isFinite(result.summary.goldenRatio)).toBe(true);
    });

    it('gestisce configurazioni estreme', async () => {
      const extremePipeline = new GoldenPipeline({
        maxSections: 1,
        maxKeywords: 1,
        maxPatterns: 1
      });

      const result = await extremePipeline.analyze(sampleText);

      expect(result.sections.length).toBeLessThanOrEqual(1);
      expect(result.keywords.length).toBeLessThanOrEqual(1);
      expect(result.patterns.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Integrazione PHI', () => {
    it('usa PHI nei calcoli di default', () => {
      const defaultPipeline = new GoldenPipeline();
      expect(PHI).toBeCloseTo(1.618033988749895, 10);
    });

    it('incorpora PHI nelle metriche', async () => {
      const result = await pipeline.analyze(sampleText);

      // Le metriche dovrebbero riflettere calcoli basati su PHI
      expect(result.summary.goldenRatio).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(result.summary.complexity)).toBe(true);
      expect(Number.isFinite(result.summary.confidence)).toBe(true);
    });
  });

  describe('Risultati struttura', () => {
    it('restituisce struttura AnalysisResult completa', async () => {
      const result = await pipeline.analyze(sampleText);

      // Verifica che tutti i campi richiesti siano presenti
      expect(result.input).toHaveProperty('text');
      expect(result.input).toHaveProperty('length');
      expect(result.input).toHaveProperty('timestamp');

      expect(Array.isArray(result.sections)).toBe(true);
      expect(Array.isArray(result.keywords)).toBe(true);
      expect(Array.isArray(result.patterns)).toBe(true);

      expect(result.summary).toHaveProperty('goldenRatio');
      expect(result.summary).toHaveProperty('complexity');
      expect(result.summary).toHaveProperty('confidence');
      expect(result.summary).toHaveProperty('processingTime');

      expect(result.cache).toHaveProperty('hits');
      expect(result.cache).toHaveProperty('misses');
      expect(result.cache).toHaveProperty('efficiency');
    });

    it('mantiene precisione numerica consistente', async () => {
      const result = await pipeline.analyze(sampleText);

      // Verifica che i valori numerici siano arrotondati correttamente
      expect(result.summary.goldenRatio.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(4);
      expect(result.summary.complexity.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(4);
      expect(result.summary.confidence.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(4);
    });
  });
});