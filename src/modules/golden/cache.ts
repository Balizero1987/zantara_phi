export const PHI = 1.618033988749895;

export type CacheEntry<T = any> = {
  key: string;
  value: T;
  timestamp: number;
  accessCount: number;
  goldenScore: number;
  decayFactor: number;
  lastAccess: number;
};

export type CacheStats = {
  totalEntries: number;
  hitRate: number;
  averageAge: number;
  averageDecay: number;
  goldenRatio: number;
  memoryUsage: number;
};

export type CacheOptions = {
  maxEntries?: number;
  maxAge?: number; // in milliseconds
  persistPath?: string;
  decayThreshold?: number;
  goldenWeight?: number;
};

// Sequenza di Fibonacci per pesi di accesso
const FIB_SEQUENCE = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

export class GoldenCache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private stats: { hits: number; misses: number; lastCleanup: number };
  private readonly options: Required<CacheOptions>;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, lastCleanup: Date.now() };

    this.options = {
      maxEntries: options.maxEntries ?? Math.floor(PHI * 100), // ~162 entries
      maxAge: options.maxAge ?? (24 * 60 * 60 * 1000), // 24 ore
      persistPath: options.persistPath ?? '',
      decayThreshold: options.decayThreshold ?? (1 / PHI), // ~0.618
      goldenWeight: options.goldenWeight ?? PHI
    };

    // Carica cache persistente se specificato path
    if (this.options.persistPath) {
      this.loadFromDisk();
    }
  }

  /**
   * Ottiene un valore dalla cache con scoring aureo
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Verifica scadenza con decay aureo
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Aggiorna statistiche di accesso
    entry.accessCount++;
    entry.lastAccess = Date.now();
    entry.goldenScore = this.calculateGoldenScore(entry);

    this.stats.hits++;
    return entry.value;
  }

  /**
   * Imposta un valore nella cache con score aureo
   */
  set(key: string, value: T): void {
    const now = Date.now();

    // Se la cache è piena, rimuovi entry con score più basso
    if (this.cache.size >= this.options.maxEntries && !this.cache.has(key)) {
      this.evictLeastGolden();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: now,
      accessCount: 1,
      goldenScore: this.calculateInitialScore(key, value),
      decayFactor: 1.0,
      lastAccess: now
    };

    this.cache.set(key, entry);

    // Cleanup periodico basato su proporzione aurea
    if (now - this.stats.lastCleanup > (this.options.maxAge / PHI)) {
      this.goldenCleanup();
      this.stats.lastCleanup = now;
    }
  }

  /**
   * Verifica se una chiave esiste nella cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Rimuove una chiave dalla cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Pulisce la cache completamente
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, lastCleanup: Date.now() };
  }

  /**
   * Ottiene statistiche della cache con metriche auree
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const now = Date.now();

    const totalAccesses = this.stats.hits + this.stats.misses;
    const hitRate = totalAccesses > 0 ? this.stats.hits / totalAccesses : 0;

    const averageAge = entries.length > 0
      ? entries.reduce((sum, e) => sum + (now - e.timestamp), 0) / entries.length
      : 0;

    const averageDecay = entries.length > 0
      ? entries.reduce((sum, e) => sum + e.decayFactor, 0) / entries.length
      : 1.0;

    const goldenRatio = this.calculateCacheGoldenRatio(entries);
    const memoryUsage = this.estimateMemoryUsage();

    return {
      totalEntries: this.cache.size,
      hitRate: Math.round(hitRate * 10000) / 10000,
      averageAge: Math.round(averageAge),
      averageDecay: Math.round(averageDecay * 10000) / 10000,
      goldenRatio: Math.round(goldenRatio * 10000) / 10000,
      memoryUsage: Math.round(memoryUsage)
    };
  }

  /**
   * Ottiene le entry ordinate per golden score
   */
  getTopEntries(limit: number = 10): Array<{ key: string; score: number; age: number }> {
    const entries = Array.from(this.cache.values());
    const now = Date.now();

    return entries
      .map(entry => ({
        key: entry.key,
        score: entry.goldenScore,
        age: now - entry.timestamp
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Persiste la cache su disco (se configurato)
   */
  async persist(): Promise<void> {
    if (!this.options.persistPath) return;

    try {
      const fs = await import('node:fs/promises');
      const data = {
        entries: Array.from(this.cache.entries()),
        stats: this.stats,
        timestamp: Date.now()
      };

      await fs.writeFile(this.options.persistPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.warn('Failed to persist cache:', error);
    }
  }

  /**
   * Carica la cache da disco
   */
  private async loadFromDisk(): Promise<void> {
    if (!this.options.persistPath) return;

    try {
      const fs = await import('node:fs/promises');
      const data = await fs.readFile(this.options.persistPath, 'utf8');
      const parsed = JSON.parse(data);

      // Ripristina entries valide
      for (const [key, entry] of parsed.entries) {
        if (!this.isExpired(entry)) {
          this.cache.set(key, entry);
        }
      }

      // Ripristina stats (opzionale)
      if (parsed.stats) {
        this.stats = { ...this.stats, ...parsed.stats };
      }
    } catch (error) {
      // File non esiste o corrotto, continua con cache vuota
    }
  }

  /**
   * Verifica se un entry è scaduto usando decay aureo
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    const age = now - entry.timestamp;

    // Se l'età supera maxAge, è sicuramente scaduto
    if (age >= this.options.maxAge) {
      entry.decayFactor = 0;
      return true;
    }

    // Calcola decay basato su età e proporzione aurea
    const ageRatio = age / this.options.maxAge;
    const decayRate = Math.pow(PHI, -ageRatio); // Decay esponenziale aureo

    entry.decayFactor = decayRate;

    return decayRate < this.options.decayThreshold;
  }

  /**
   * Calcola score aureo per un entry
   */
  private calculateGoldenScore(entry: CacheEntry<T>): number {
    const now = Date.now();

    // Fattori che influenzano lo score
    const accessFactor = this.getFibonacciWeight(entry.accessCount);
    const recencyFactor = 1 / (1 + (now - entry.lastAccess) / (this.options.maxAge / PHI));
    const ageFactor = Math.max(0.1, entry.decayFactor);

    // Score combinato con golden ratio
    const rawScore = accessFactor * recencyFactor * ageFactor;
    return Math.min(1.0, rawScore * this.options.goldenWeight);
  }

  /**
   * Calcola score iniziale per nuovi entry
   */
  private calculateInitialScore(key: string, value: T): number {
    // Score basato su caratteristiche della chiave e valore
    const keyComplexity = Math.min(1.0, key.length / (PHI * 10));
    const valueSize = this.estimateSize(value);
    const sizeBonus = Math.min(0.5, valueSize / 1000); // Bonus per valori più grandi

    return (keyComplexity + sizeBonus) * (1 / PHI); // Normalizza con proporzione aurea
  }

  /**
   * Rimuove entry con score più basso (eviction aurea)
   */
  private evictLeastGolden(): void {
    if (this.cache.size === 0) return;

    let lowestScore = Infinity;
    let worstKey = '';

    for (const [key, entry] of this.cache) {
      const currentScore = this.calculateGoldenScore(entry);
      if (currentScore < lowestScore) {
        lowestScore = currentScore;
        worstKey = key;
      }
    }

    if (worstKey) {
      this.cache.delete(worstKey);
    }
  }

  /**
   * Cleanup periodico con logica aurea
   */
  private goldenCleanup(): void {
    const entries = Array.from(this.cache.entries());
    const toRemove: string[] = [];

    for (const [key, entry] of entries) {
      // Rimuovi entry scaduti o con score troppo basso
      if (this.isExpired(entry) || entry.goldenScore < this.options.decayThreshold) {
        toRemove.push(key);
      }
    }

    // Rimuovi una frazione aurea se la cache è troppo piena
    const maxRemoval = Math.floor(this.cache.size / PHI);
    const finalRemoval = toRemove.slice(0, maxRemoval);

    for (const key of finalRemoval) {
      this.cache.delete(key);
    }
  }

  /**
   * Calcola golden ratio della distribuzione della cache
   */
  private calculateCacheGoldenRatio(entries: CacheEntry<T>[]): number {
    if (entries.length < 2) return 0;

    const scores = entries.map(e => e.goldenScore).sort((a, b) => b - a);
    let totalRatio = 0;

    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > 0) {
        const ratio = scores[i - 1] / scores[i];
        const distance = Math.abs(ratio - PHI);
        const goldenScore = Math.max(0, 1 - distance);
        totalRatio += goldenScore;
      }
    }

    return totalRatio / (scores.length - 1);
  }

  /**
   * Ottiene peso Fibonacci per access count
   */
  private getFibonacciWeight(accessCount: number): number {
    const index = Math.min(accessCount - 1, FIB_SEQUENCE.length - 1);
    const fibValue = FIB_SEQUENCE[Math.max(0, index)];
    return Math.min(1.0, fibValue / (PHI * 100)); // Normalizza
  }

  /**
   * Stima la dimensione di un oggetto in bytes
   */
  private estimateSize(obj: any): number {
    if (obj === null || obj === undefined) return 0;
    if (typeof obj === 'string') return obj.length * 2; // UTF-16
    if (typeof obj === 'number') return 8;
    if (typeof obj === 'boolean') return 4;
    if (typeof obj === 'object') {
      return JSON.stringify(obj).length * 2; // Approssimazione
    }
    return 16; // Default
  }

  /**
   * Stima l'uso di memoria della cache
   */
  private estimateMemoryUsage(): number {
    let total = 0;
    for (const entry of this.cache.values()) {
      total += this.estimateSize(entry.key);
      total += this.estimateSize(entry.value);
      total += 64; // Overhead metadata
    }
    return total;
  }
}

// Factory per cache specializzate
export class GoldenCacheFactory {
  /**
   * Crea cache per risultati di keyword extraction
   */
  static createKeywordCache(persistPath?: string): GoldenCache<any> {
    return new GoldenCache({
      maxEntries: Math.floor(PHI * 50), // ~81 entries
      maxAge: 2 * 60 * 60 * 1000, // 2 ore
      persistPath,
      decayThreshold: 0.5,
      goldenWeight: PHI
    });
  }

  /**
   * Crea cache per pattern matching
   */
  static createPatternCache(persistPath?: string): GoldenCache<any> {
    return new GoldenCache({
      maxEntries: Math.floor(PHI * 30), // ~49 entries
      maxAge: 60 * 60 * 1000, // 1 ora
      persistPath,
      decayThreshold: 0.618,
      goldenWeight: PHI * 0.8
    });
  }

  /**
   * Crea cache per text splitting
   */
  static createSplitCache(persistPath?: string): GoldenCache<any> {
    return new GoldenCache({
      maxEntries: Math.floor(PHI * 20), // ~32 entries
      maxAge: 30 * 60 * 1000, // 30 minuti
      persistPath,
      decayThreshold: 0.382,
      goldenWeight: PHI * 1.2
    });
  }
}

// --- CLI (solo quando eseguito via script npm con RUN_AS_CLI=1) ---
if (process.env.RUN_AS_CLI === '1') {
  (async () => {
    const args = process.argv.slice(2);
    const command = args[0] || 'demo';

    const cache = new GoldenCache<string>({
      maxEntries: 10,
      maxAge: 5 * 60 * 1000, // 5 minuti per demo
    });

    switch (command) {
      case 'demo':
        console.log('🏛️ GOLDEN CACHE DEMO (φ = ' + PHI + ')\n');

        // Aggiungi alcuni valori
        cache.set('test1', 'Primo valore di test');
        cache.set('test2', 'Secondo valore con più contenuto per testing');
        cache.set('phi', 'Golden ratio value: ' + PHI);

        // Simula accessi multipli
        for (let i = 0; i < 5; i++) {
          cache.get('phi');
        }

        cache.get('test1');
        cache.get('test1');

        // Mostra statistiche
        const stats = cache.getStats();
        console.log('📊 CACHE STATS:');
        console.log(`   Entries: ${stats.totalEntries}`);
        console.log(`   Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
        console.log(`   Avg Age: ${(stats.averageAge / 1000).toFixed(1)}s`);
        console.log(`   Avg Decay: ${stats.averageDecay.toFixed(3)}`);
        console.log(`   Golden Ratio: ${stats.goldenRatio.toFixed(3)}`);
        console.log(`   Memory: ${stats.memoryUsage} bytes\n`);

        // Mostra top entries
        console.log('🏆 TOP ENTRIES:');
        const topEntries = cache.getTopEntries(5);
        topEntries.forEach((entry, i) => {
          console.log(`   ${i + 1}. ${entry.key.padEnd(10)} score: ${entry.score.toFixed(3)} age: ${(entry.age / 1000).toFixed(1)}s`);
        });
        break;

      case 'stress':
        console.log('⚡ STRESS TEST GOLDEN CACHE\n');

        const start = Date.now();

        // Aggiungi molti valori
        for (let i = 0; i < 1000; i++) {
          cache.set(`key_${i}`, `Value ${i} with some content to test memory usage`);
        }

        // Test accessi casuali
        let hits = 0;
        for (let i = 0; i < 2000; i++) {
          const randomKey = `key_${Math.floor(Math.random() * 1000)}`;
          if (cache.get(randomKey)) hits++;
        }

        const elapsed = Date.now() - start;
        const finalStats = cache.getStats();

        console.log(`⏱️  Completed in ${elapsed}ms`);
        console.log(`🎯 Hit rate: ${(finalStats.hitRate * 100).toFixed(1)}%`);
        console.log(`💾 Final entries: ${finalStats.totalEntries}`);
        console.log(`📈 Golden ratio: ${finalStats.goldenRatio.toFixed(3)}`);
        break;

      default:
        console.log('Usage: npm run cache [demo|stress]');
    }
  })();
}