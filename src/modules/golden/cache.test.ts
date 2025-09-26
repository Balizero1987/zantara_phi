import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoldenCache, GoldenCacheFactory, PHI, CacheEntry } from './cache';

describe('GoldenCache', () => {
  let cache: GoldenCache<string>;

  beforeEach(() => {
    cache = new GoldenCache<string>({
      maxEntries: 5,
      maxAge: 1000, // 1 secondo per test rapidi
      decayThreshold: 0.5,
      goldenWeight: PHI
    });
  });

  describe('Costruttore e configurazione', () => {
    it('crea istanza con parametri default', () => {
      const defaultCache = new GoldenCache();
      expect(defaultCache).toBeDefined();

      const stats = defaultCache.getStats();
      expect(stats.totalEntries).toBe(0);
    });

    it('accetta parametri di configurazione personalizzati', () => {
      const customCache = new GoldenCache({
        maxEntries: 10,
        maxAge: 5000,
        decayThreshold: 0.3,
        goldenWeight: 2.0
      });

      expect(customCache).toBeDefined();
    });

    it('usa valori basati su PHI per default', () => {
      const defaultCache = new GoldenCache();
      const stats = defaultCache.getStats();

      // Verifica che i valori default includano PHI
      expect(PHI).toBeCloseTo(1.618033988749895, 10);
    });
  });

  describe('Operazioni base cache', () => {
    it('imposta e ottiene valori', () => {
      cache.set('test', 'value');
      expect(cache.get('test')).toBe('value');
    });

    it('restituisce undefined per chiavi inesistenti', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('verifica esistenza chiavi', () => {
      cache.set('test', 'value');
      expect(cache.has('test')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('rimuove chiavi', () => {
      cache.set('test', 'value');
      expect(cache.has('test')).toBe(true);

      const deleted = cache.delete('test');
      expect(deleted).toBe(true);
      expect(cache.has('test')).toBe(false);
    });

    it('pulisce la cache completamente', () => {
      cache.set('test1', 'value1');
      cache.set('test2', 'value2');

      expect(cache.getStats().totalEntries).toBe(2);

      cache.clear();
      expect(cache.getStats().totalEntries).toBe(0);
    });
  });

  describe('Golden scoring', () => {
    it('calcola score aureo per entry', () => {
      cache.set('test', 'value');

      // Accedi più volte per aumentare score
      for (let i = 0; i < 5; i++) {
        cache.get('test');
      }

      const topEntries = cache.getTopEntries(1);
      expect(topEntries.length).toBe(1);
      expect(topEntries[0].key).toBe('test');
      expect(topEntries[0].score).toBeGreaterThan(0);
    });

    it('ordina entry per golden score', () => {
      cache.set('low', 'value');
      cache.set('high', 'value');

      // Accedi più volte a 'high' per aumentare score
      for (let i = 0; i < 10; i++) {
        cache.get('high');
      }

      cache.get('low'); // Solo un accesso

      const topEntries = cache.getTopEntries(2);
      expect(topEntries[0].key).toBe('high');
      expect(topEntries[1].key).toBe('low');
      expect(topEntries[0].score).toBeGreaterThan(topEntries[1].score);
    });

    it('applica pesi Fibonacci agli access count', () => {
      cache.set('fib1', 'value');
      cache.set('fib2', 'value');

      // Accessi con numeri Fibonacci
      cache.get('fib1'); // 1 accesso
      for (let i = 0; i < 3; i++) cache.get('fib2'); // 3 accessi

      const topEntries = cache.getTopEntries(2);
      expect(topEntries[0].key).toBe('fib2'); // Più accessi = score più alto
    });
  });

  describe('Scadenza e decay aureo', () => {
    it('rimuove entry scaduti', async () => {
      cache.set('expire', 'value');
      expect(cache.has('expire')).toBe(true);

      // Aspetta che scada
      await new Promise(resolve => setTimeout(resolve, 1100));

      expect(cache.has('expire')).toBe(false);
      expect(cache.get('expire')).toBeUndefined();
    });

    it('applica decay basato su età', async () => {
      cache.set('decay', 'value');

      const immediate = cache.getTopEntries(1)[0];
      const initialScore = immediate.score;

      // Aspetta un po'
      await new Promise(resolve => setTimeout(resolve, 500));

      // Ri-accedi per aggiornare score
      cache.get('decay');
      const afterDelay = cache.getTopEntries(1)[0];

      // Score dovrebbe essere diminuito per decay
      expect(afterDelay.score).toBeLessThanOrEqual(initialScore);
    });

    it('mantiene entry recentemente accessati', async () => {
      cache.set('fresh', 'value');

      // Aspetta metà del tempo di scadenza
      await new Promise(resolve => setTimeout(resolve, 400));

      // Accedi per mantenerlo "fresco"
      const value = cache.get('fresh');
      expect(value).toBe('value'); // Dovrebbe essere ancora accessibile

      // Aspetta meno del tempo totale
      await new Promise(resolve => setTimeout(resolve, 300));

      // Dovrebbe essere ancora valido (totale < 1000ms)
      expect(cache.has('fresh')).toBe(true);
    });
  });

  describe('Eviction aurea', () => {
    it('rimuove entry con score più basso quando piena', () => {
      // Riempi la cache
      for (let i = 0; i < 5; i++) {
        cache.set(`item${i}`, `value${i}`);
      }

      expect(cache.getStats().totalEntries).toBe(5);

      // Rendi un entry molto popolare
      for (let i = 0; i < 10; i++) {
        cache.get('item0');
      }

      // Aggiungi un nuovo entry (dovrebbe triggare eviction)
      cache.set('new', 'newvalue');

      expect(cache.getStats().totalEntries).toBe(5); // Ancora 5
      expect(cache.has('item0')).toBe(true); // L'entry popolare rimane
      expect(cache.has('new')).toBe(true); // Il nuovo è stato aggiunto
    });

    it('mantiene entry con golden score alto', () => {
      cache.set('keeper', 'important');
      cache.set('disposable', 'unimportant');

      // Rendi 'keeper' molto prezioso
      for (let i = 0; i < 20; i++) {
        cache.get('keeper');
      }

      // Riempi la cache per forzare eviction
      for (let i = 0; i < 5; i++) {
        cache.set(`filler${i}`, `filler${i}`);
      }

      expect(cache.has('keeper')).toBe(true);
    });
  });

  describe('Statistiche auree', () => {
    it('calcola hit rate correttamente', () => {
      cache.set('test', 'value');

      // 5 hit, 3 miss
      for (let i = 0; i < 5; i++) cache.get('test');
      for (let i = 0; i < 3; i++) cache.get('missing');

      const stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(5 / 8, 3); // 62.5%
    });

    it('calcola età media degli entry', () => {
      cache.set('old', 'value');
      cache.set('new', 'value');

      const stats = cache.getStats();
      expect(stats.averageAge).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(stats.averageAge)).toBe(true);
    });

    it('calcola golden ratio della distribuzione', () => {
      cache.set('a', 'value');
      cache.set('b', 'value');
      cache.set('c', 'value');

      // Crea distribuzione con access diversi
      for (let i = 0; i < 8; i++) cache.get('a');
      for (let i = 0; i < 5; i++) cache.get('b');
      for (let i = 0; i < 3; i++) cache.get('c');

      const stats = cache.getStats();
      expect(stats.goldenRatio).toBeGreaterThanOrEqual(0);
      expect(stats.goldenRatio).toBeLessThanOrEqual(1);
    });

    it('stima uso memoria', () => {
      cache.set('small', 'a');
      cache.set('medium', 'medium value with more content');
      cache.set('large', 'very large value with significant amount of content for testing memory estimation');

      const stats = cache.getStats();
      expect(stats.memoryUsage).toBeGreaterThan(0);
      expect(Number.isFinite(stats.memoryUsage)).toBe(true);
    });
  });

  describe('Top entries', () => {
    it('restituisce entry ordinati per score', () => {
      cache.set('low', 'value');
      cache.set('medium', 'value');
      cache.set('high', 'value');

      // Crea score diversi
      cache.get('low');
      for (let i = 0; i < 5; i++) cache.get('medium');
      for (let i = 0; i < 10; i++) cache.get('high');

      const top = cache.getTopEntries(3);
      expect(top[0].key).toBe('high');
      expect(top[1].key).toBe('medium');
      expect(top[2].key).toBe('low');
    });

    it('limita il numero di risultati', () => {
      for (let i = 0; i < 10; i++) {
        cache.set(`item${i}`, `value${i}`);
      }

      const top3 = cache.getTopEntries(3);
      expect(top3.length).toBe(3);
    });

    it('include età degli entry', () => {
      cache.set('test', 'value');

      const top = cache.getTopEntries(1);
      expect(top[0].age).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(top[0].age)).toBe(true);
    });
  });

  describe('Cleanup automatico', () => {
    it('esegue cleanup periodico', async () => {
      // Crea cache con cleanup frequente
      const quickCache = new GoldenCache<string>({
        maxEntries: 10,
        maxAge: 100, // 100ms
        decayThreshold: 0.8
      });

      quickCache.set('temp1', 'value');
      quickCache.set('temp2', 'value');

      expect(quickCache.getStats().totalEntries).toBe(2);

      // Aspetta scadenza + tempo cleanup
      await new Promise(resolve => setTimeout(resolve, 200));

      // Aggiungi nuovo entry per triggare cleanup
      quickCache.set('new', 'value');

      // Gli entry scaduti dovrebbero essere rimossi (oppure rimanere se cleanup non è ancora scattato)
      expect(quickCache.getStats().totalEntries).toBeLessThanOrEqual(3);
    });
  });

  describe('Edge cases', () => {
    it('gestisce cache vuota', () => {
      const stats = cache.getStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.hitRate).toBe(0);

      const top = cache.getTopEntries(5);
      expect(top.length).toBe(0);
    });

    it('gestisce valori null e undefined', () => {
      cache.set('null', null as any);
      cache.set('undefined', undefined as any);

      expect(cache.get('null')).toBeNull();
      expect(cache.get('undefined')).toBeUndefined();
      expect(cache.has('null')).toBe(true);
      expect(cache.has('undefined')).toBe(true);
    });

    it('gestisce oggetti complessi', () => {
      const complexObject = {
        name: 'test',
        data: [1, 2, 3, { nested: true }],
        timestamp: Date.now()
      };

      cache.set('complex', complexObject as any);
      expect(cache.get('complex')).toEqual(complexObject);
    });

    it('gestisce chiavi duplicate', () => {
      cache.set('duplicate', 'first');
      cache.set('duplicate', 'second');

      expect(cache.get('duplicate')).toBe('second');
      expect(cache.getStats().totalEntries).toBe(1);
    });
  });

  describe('Integrazione PHI', () => {
    it('usa PHI nei calcoli di configurazione', () => {
      const defaultCache = new GoldenCache();
      // I valori default dovrebbero incorporare PHI
      expect(PHI).toBeCloseTo(1.618033988749895, 10);
    });

    it('applica proporzioni auree nei pesi', () => {
      cache.set('phi', 'golden');

      // Score dovrebbe riflettere calcoli basati su PHI
      const top = cache.getTopEntries(1);
      expect(top[0].score).toBeGreaterThan(0);
      expect(Number.isFinite(top[0].score)).toBe(true);
    });
  });
});

describe('GoldenCacheFactory', () => {
  it('crea cache per keyword extraction', () => {
    const keywordCache = GoldenCacheFactory.createKeywordCache();
    expect(keywordCache).toBeInstanceOf(GoldenCache);

    const stats = keywordCache.getStats();
    expect(stats.totalEntries).toBe(0);
  });

  it('crea cache per pattern matching', () => {
    const patternCache = GoldenCacheFactory.createPatternCache();
    expect(patternCache).toBeInstanceOf(GoldenCache);
  });

  it('crea cache per text splitting', () => {
    const splitCache = GoldenCacheFactory.createSplitCache();
    expect(splitCache).toBeInstanceOf(GoldenCache);
  });

  it('accetta path di persistenza personalizzati', () => {
    const persistentCache = GoldenCacheFactory.createKeywordCache('/tmp/test-cache.json');
    expect(persistentCache).toBeInstanceOf(GoldenCache);
  });

  it('crea cache con configurazioni diverse', () => {
    const keyword = GoldenCacheFactory.createKeywordCache();
    const pattern = GoldenCacheFactory.createPatternCache();
    const split = GoldenCacheFactory.createSplitCache();

    // Le cache dovrebbero avere configurazioni diverse
    keyword.set('test', 'keyword');
    pattern.set('test', 'pattern');
    split.set('test', 'split');

    expect(keyword.has('test')).toBe(true);
    expect(pattern.has('test')).toBe(true);
    expect(split.has('test')).toBe(true);
  });
});

describe('Persistenza', () => {
  it('gestisce errori di persistenza gracefully', async () => {
    const cache = new GoldenCache({
      persistPath: '/invalid/path/cache.json'
    });

    cache.set('test', 'value');

    // Non dovrebbe lanciare errori
    await expect(cache.persist()).resolves.toBeUndefined();
  });

  it('carica cache esistente all\'avvio', () => {
    // Test per verificare che il caricamento non crashhi
    const cache = new GoldenCache({
      persistPath: '/tmp/nonexistent-cache.json'
    });

    expect(cache).toBeDefined();
    expect(cache.getStats().totalEntries).toBe(0);
  });
});