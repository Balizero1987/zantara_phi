export const PHI = 1.618033988749895;

export type KeywordResult = {
  keyword: string;
  score: number;      // Score finale basato su PHI ratios
  frequency: number;  // Frequenza nel documento
  idf: number;        // Inverse Document Frequency
  confidence: number; // Confidence basato su proporzione aurea
};

// Stop-words italiane e inglesi built-in
const STOP_WORDS = new Set([
  // Italiano
  'il', 'la', 'le', 'lo', 'gli', 'un', 'una', 'uno', 'di', 'da', 'del', 'della', 'dei', 'delle',
  'con', 'per', 'su', 'tra', 'fra', 'in', 'a', 'ad', 'al', 'alla', 'allo', 'ai', 'alle', 'agli',
  'che', 'chi', 'cui', 'come', 'quando', 'dove', 'mentre', 'se', 'ma', 'però', 'quindi', 'così',
  'anche', 'ancora', 'sempre', 'mai', 'già', 'più', 'molto', 'poco', 'tanto', 'tutto', 'tutti',
  'essere', 'avere', 'fare', 'dire', 'andare', 'venire', 'volere', 'potere', 'dovere', 'sapere',
  'sono', 'sei', 'è', 'siamo', 'siete', 'ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno',
  'faccio', 'fai', 'fa', 'facciamo', 'fate', 'fanno', 'dico', 'dici', 'dice', 'diciamo', 'dite', 'dicono',
  'questo', 'questa', 'questi', 'queste', 'quello', 'quella', 'quelli', 'quelle', 'altro', 'altri', 'altre',

  // Inglese
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'from', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down',
  'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
  'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will',
  'just', 'should', 'now', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their', 'what',
  'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'get', 'got', 'getting', 'give', 'gave',
  'given', 'giving', 'go', 'goes', 'going', 'went', 'gone', 'make', 'makes', 'made', 'making'
]);

// Sequenza di Fibonacci per pesi di lunghezza
const FIB_SEQUENCE = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

export class GoldenKeywordExtractor {
  private readonly minWordLength: number;
  private readonly maxKeywords: number;
  private readonly phiThreshold: number;

  constructor(options: {
    minWordLength?: number;
    maxKeywords?: number;
    phiThreshold?: number;
  } = {}) {
    this.minWordLength = options.minWordLength ?? 3;
    this.maxKeywords = options.maxKeywords ?? 20;
    this.phiThreshold = options.phiThreshold ?? (1 / PHI); // ~0.618
  }

  /**
   * Estrae keywords pesate da un testo usando algoritmi basati su PHI
   */
  extractKeywords(text: string, maxKeywords?: number): KeywordResult[] {
    const limit = maxKeywords ?? this.maxKeywords;
    if (!text?.trim()) return [];

    // 1. Preprocessing: pulizia e tokenizzazione
    const tokens = this.tokenize(text);
    if (tokens.length === 0) return [];

    // 2. Calcolo frequenze e filtering
    const termFreqs = this.calculateTermFrequencies(tokens);
    const validTerms = Array.from(termFreqs.keys()).filter(term => this.isValidTerm(term));

    if (validTerms.length === 0) return [];

    // 3. Calcolo IDF per ogni termine (simulato con corpus immaginario)
    const idfScores = this.calculateIDF(validTerms, tokens.length);

    // 4. Calcolo score finale con pesi Fibonacci e PHI
    const results: KeywordResult[] = validTerms.map(term => {
      const frequency = termFreqs.get(term)!;
      const idf = idfScores.get(term)!;
      const fibWeight = this.getFibonacciWeight(term);

      // TF-IDF base
      const tfIdf = (frequency / tokens.length) * idf;

      // Score finale con proporzione aurea
      const goldenBoost = this.calculateGoldenBoost(term, frequency, tokens.length);
      const score = tfIdf * fibWeight * goldenBoost;

      // Confidence basato su PHI ratios
      const confidence = this.calculateConfidence(frequency, tokens.length, term.length);

      return {
        keyword: term,
        score: Math.round(score * 10000) / 10000, // 4 decimali per deterministicità
        frequency,
        idf: Math.round(idf * 10000) / 10000,
        confidence: Math.round(confidence * 10000) / 10000
      };
    });

    // 5. Ordinamento per score e limitazione
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Tokenizza il testo in termini puliti
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Rimuove punteggiatura
      .split(/\s+/)
      .filter(token => token.length >= this.minWordLength)
      .filter(token => !/^\d+$/.test(token)); // Rimuove numeri puri
  }

  /**
   * Calcola frequenze dei termini
   */
  private calculateTermFrequencies(tokens: string[]): Map<string, number> {
    const freqs = new Map<string, number>();

    // Singole parole
    for (const token of tokens) {
      freqs.set(token, (freqs.get(token) || 0) + 1);
    }

    // Compound terms (bigrammi significativi)
    for (let i = 0; i < tokens.length - 1; i++) {
      const bigram = `${tokens[i]} ${tokens[i + 1]}`;
      if (this.isSignificantBigram(tokens[i], tokens[i + 1])) {
        freqs.set(bigram, (freqs.get(bigram) || 0) + 1);
      }
    }

    return freqs;
  }

  /**
   * Verifica se un termine è valido per l'estrazione
   */
  private isValidTerm(term: string): boolean {
    // Controlla stop-words
    if (STOP_WORDS.has(term.toLowerCase())) return false;

    // Controlla stop-words nei bigrammi
    if (term.includes(' ')) {
      const words = term.split(' ');
      if (words.some(word => STOP_WORDS.has(word))) return false;
    }

    // Lunghezza minima
    if (term.replace(/\s/g, '').length < this.minWordLength) return false;

    return true;
  }

  /**
   * Verifica se un bigramma è significativo
   */
  private isSignificantBigram(word1: string, word2: string): boolean {
    // Evita bigrammi con stop-words
    if (STOP_WORDS.has(word1) || STOP_WORDS.has(word2)) return false;

    // Entrambe le parole devono essere sufficientemente lunghe
    if (word1.length < 3 || word2.length < 3) return false;

    return true;
  }

  /**
   * Calcola IDF simulato (Inverse Document Frequency)
   */
  private calculateIDF(terms: string[], totalTokens: number): Map<string, number> {
    const idfScores = new Map<string, number>();

    // Simula un corpus con distribuzione basata su lunghezza e frequenza
    const avgTermLength = terms.reduce((sum, term) => sum + term.length, 0) / terms.length;

    for (const term of terms) {
      // IDF simulato basato su caratteristiche del termine
      const lengthFactor = term.length / avgTermLength;
      const rarityFactor = totalTokens / (terms.filter(t => t.includes(term.split(' ')[0])).length + 1);

      // Formula IDF modificata con fattori aurei
      const idf = Math.log(totalTokens / (1 + lengthFactor)) * (1 + 1/PHI * rarityFactor);
      idfScores.set(term, Math.max(1, idf)); // IDF minimo = 1
    }

    return idfScores;
  }

  /**
   * Calcola peso Fibonacci basato sulla lunghezza del termine
   */
  private getFibonacciWeight(term: string): number {
    const length = term.replace(/\s/g, '').length; // Lunghezza senza spazi
    const fibIndex = Math.min(length - 1, FIB_SEQUENCE.length - 1);
    const fibValue = FIB_SEQUENCE[fibIndex] || FIB_SEQUENCE[FIB_SEQUENCE.length - 1];

    // Normalizza con PHI per evitare pesi troppo alti
    return 1 + (fibValue / (PHI * 10));
  }

  /**
   * Calcola boost basato su proporzione aurea
   */
  private calculateGoldenBoost(term: string, frequency: number, totalTokens: number): number {
    const relativeFreq = frequency / totalTokens;

    // Boost per termini con frequenza vicina a rapporti aurei
    const goldenRatios = [1/PHI, 1/(PHI*PHI), PHI/10, 1/PHI/2]; // ~0.618, ~0.382, ~0.162, ~0.309

    let boost = 1.0;
    for (const ratio of goldenRatios) {
      const distance = Math.abs(relativeFreq - ratio);
      if (distance < 0.1) { // Tolleranza del 10%
        boost *= (1 + (1 - distance) * 0.5); // Boost proporzionale alla vicinanza
      }
    }

    // Penalty per termini troppo frequenti o troppo rari
    if (relativeFreq > 0.3) boost *= 0.7; // Penalty per over-frequency
    if (relativeFreq < 0.01) boost *= 0.8; // Penalty per under-frequency

    return boost;
  }

  /**
   * Calcola confidence basato su PHI ratios
   */
  private calculateConfidence(frequency: number, totalTokens: number, termLength: number): number {
    const relativeFreq = frequency / totalTokens;

    // Confidence base dalla frequenza
    const freqConfidence = Math.min(1.0, relativeFreq * PHI * 10);

    // Confidence dalla lunghezza (termini più lunghi sono più specifici)
    const lengthConfidence = Math.min(1.0, termLength / (PHI * 5));

    // Confidence combinata con proporzione aurea
    const combined = freqConfidence * (1/PHI) + lengthConfidence * PHI;

    return Math.min(1.0, combined / (1 + PHI));
  }
}

// --- CLI (solo quando eseguito via script npm con RUN_AS_CLI=1) ---
if (process.env.RUN_AS_CLI === '1') {
  (async () => {
    const fs = await import('node:fs/promises');
    const args = process.argv.slice(2);
    const jsonFlag = args.includes('--json');
    const nonFlagArgs = args.filter(arg => !arg.startsWith('--'));

    const argPath = nonFlagArgs[0] && !isNaN(parseInt(nonFlagArgs[0])) ? undefined : nonFlagArgs[0];
    const maxKeywords = nonFlagArgs.find(arg => !isNaN(parseInt(arg))) ? parseInt(nonFlagArgs.find(arg => !isNaN(parseInt(arg)))!) : 20;
    const mode = jsonFlag ? 'json' : 'pretty';

    const input = argPath ? await fs.readFile(argPath, 'utf8') : await readStdin();
    const extractor = new GoldenKeywordExtractor();
    const keywords = extractor.extractKeywords(input, maxKeywords);

    if (mode === 'json') {
      console.log(JSON.stringify(keywords, null, 2));
    } else {
      console.log(`\n🔑 TOP ${keywords.length} KEYWORDS (PHI-weighted)\n`);
      keywords.forEach((kw, i) => {
        const bar = '█'.repeat(Math.ceil(kw.score * 20));
        console.log(`${(i + 1).toString().padStart(2)}. ${kw.keyword.padEnd(20)} │ score: ${kw.score.toFixed(4)} │ freq: ${kw.frequency.toString().padStart(2)} │ conf: ${kw.confidence.toFixed(3)} │ ${bar}`);
      });
    }
  })();

  async function readStdin(): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const ch of process.stdin) chunks.push(Buffer.from(ch));
    return Buffer.concat(chunks).toString('utf8');
  }
}