export const PHI = 1.618033988749895;

export type PatternMatch = {
  pattern: string;
  matches: Array<{
    start: number;
    end: number;
    text: string;
    confidence: number;
    fractalDepth: number;
  }>;
  score: number;
  frequency: number;
  goldenRatio: number;
};

export type FractalPattern = {
  level: number;
  pattern: RegExp;
  weight: number;
  description: string;
};

// Sequenza di Fibonacci per pesi frattali
const FIB_SEQUENCE = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

// Pattern frattali con geometria aurea
const FRACTAL_PATTERNS: FractalPattern[] = [
  // Livello 1: Pattern base (φ^0)
  { level: 1, pattern: /\b[A-Z][a-z]+\b/g, weight: 1.0, description: "Parole capitalizzate" },
  { level: 1, pattern: /\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g, weight: 0.8, description: "Numeri formattati" },
  { level: 1, pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, weight: 1.2, description: "Email" },

  // Livello 2: Pattern compositi (φ^1)
  { level: 2, pattern: /\b(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?\b/g, weight: PHI, description: "URL" },
  { level: 2, pattern: /\b[A-Z]{2,}\b/g, weight: PHI * 0.8, description: "Acronimi" },
  { level: 2, pattern: /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, weight: PHI * 0.9, description: "Date" },

  // Livello 3: Pattern complessi (φ^2)
  { level: 3, pattern: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g, weight: PHI * PHI, description: "Nomi propri composti" },
  { level: 3, pattern: /\b(?:[\w\.-]+@[\w\.-]+\.[\w]+)\b/g, weight: PHI * PHI * 0.9, description: "Email complesse" },
  { level: 3, pattern: /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g, weight: PHI * PHI * 0.7, description: "Valute" },

  // Livello 4: Pattern frattali (φ^3)
  { level: 4, pattern: /\b(?:[A-Z][a-z]*){2,}\s*(?:\([^)]*\))?\b/g, weight: Math.pow(PHI, 3), description: "Entità complesse" },
  { level: 4, pattern: /\b\d{1,3}(?:\.\d{1,3}){3}\b/g, weight: Math.pow(PHI, 3) * 0.8, description: "IP addresses" },

  // Livello 5: Meta-pattern (φ^4)
  { level: 5, pattern: /\b(?:[A-Z][a-z]*(?:\s+[A-Z][a-z]*)*)\s*:\s*(?:[A-Z][a-z]*(?:\s+[A-Z][a-z]*)*)\b/g, weight: Math.pow(PHI, 4), description: "Relazioni strutturate" }
];

export class GoldenPatternMatcher {
  private readonly maxDepth: number;
  private readonly confidenceThreshold: number;
  private readonly fractalWeight: number;

  constructor(options: {
    maxDepth?: number;
    confidenceThreshold?: number;
    fractalWeight?: number;
  } = {}) {
    this.maxDepth = options.maxDepth ?? 5;
    this.confidenceThreshold = options.confidenceThreshold ?? 0.1; // Soglia più bassa per trovare pattern
    this.fractalWeight = options.fractalWeight ?? PHI;
  }

  /**
   * Trova pattern usando geometria frattale aurea
   */
  findPatterns(text: string, customPatterns: FractalPattern[] = []): PatternMatch[] {
    if (!text?.trim()) return [];

    const allPatterns = [...FRACTAL_PATTERNS, ...customPatterns]
      .filter(p => p.level <= this.maxDepth)
      .sort((a, b) => a.level - b.level);

    const results: PatternMatch[] = [];

    for (const fractalPattern of allPatterns) {
      const matches = this.findPatternMatches(text, fractalPattern);
      if (matches.length > 0) {
        const score = this.calculateFractalScore(matches, fractalPattern, text.length);
        const goldenRatio = this.calculateGoldenRatio(matches, text.length);

        results.push({
          pattern: fractalPattern.description,
          matches,
          score: Math.round(score * 10000) / 10000,
          frequency: matches.length,
          goldenRatio: Math.round(goldenRatio * 10000) / 10000
        });
      }
    }

    return results
      .filter(r => r.score >= this.confidenceThreshold)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Trova pattern ricorsivi con auto-similarità
   */
  findRecursivePatterns(text: string, depth: number = 3): PatternMatch[] {
    const results: PatternMatch[] = [];
    const segments = this.createFractalSegments(text, depth);

    for (let level = 1; level <= depth; level++) {
      const levelSegments = segments.filter(s => s.level === level);

      for (const segment of levelSegments) {
        const patterns = this.extractSelfSimilarPatterns(segment.text, level);
        results.push(...patterns);
      }
    }

    return this.mergeSimilarPatterns(results);
  }

  /**
   * Analizza la dimensione frattale del testo
   */
  calculateFractalDimension(text: string): number {
    if (!text || text.length < 5) return 0.5; // Fallback per testi molto brevi

    const levels = Math.min(5, Math.max(1, Math.floor(Math.log(text.length) / Math.log(PHI))));
    let totalComplexity = 0;
    let validLevels = 0;

    for (let level = 1; level <= levels; level++) {
      const segmentSize = Math.floor(text.length / Math.pow(PHI, level));
      if (segmentSize < 3) break;

      const segments = this.chunkText(text, segmentSize);
      const uniqueness = this.calculateUniqueness(segments);
      const levelComplexity = uniqueness * Math.pow(PHI, level - 1);

      totalComplexity += levelComplexity;
      validLevels++;
    }

    if (validLevels === 0) return 0.5;
    return Math.min(2.0, Math.max(0.1, totalComplexity / validLevels));
  }

  /**
   * Trova pattern in un singolo livello frattale
   */
  private findPatternMatches(text: string, fractalPattern: FractalPattern) {
    const matches: PatternMatch['matches'] = [];
    const regex = new RegExp(fractalPattern.pattern.source, fractalPattern.pattern.flags);

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const confidence = this.calculatePatternConfidence(
        match[0],
        match.index,
        text.length,
        fractalPattern.level
      );

      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        confidence: Math.round(confidence * 10000) / 10000,
        fractalDepth: fractalPattern.level
      });

      // Previeni loop infiniti
      if (regex.lastIndex === match.index) {
        regex.lastIndex++;
      }
    }

    return matches;
  }

  /**
   * Calcola confidence del pattern basato su geometria aurea
   */
  private calculatePatternConfidence(
    matchText: string,
    position: number,
    totalLength: number,
    fractalLevel: number
  ): number {
    // Confidence base dalla lunghezza
    const lengthFactor = Math.min(1.0, matchText.length / (PHI * 10));

    // Confidence dalla posizione (golden sections nel testo)
    const relativePosition = position / totalLength;
    const goldenPositions = [0.382, 0.618, 0.786]; // Sezioni auree
    const positionBonus = goldenPositions.reduce((bonus, pos) => {
      const distance = Math.abs(relativePosition - pos);
      return bonus + (distance < 0.1 ? (1 - distance) * 0.2 : 0);
    }, 0);

    // Confidence dal livello frattale
    const fractalBonus = getFibonacciWeight(fractalLevel) / 100;

    // Confidence combinata
    const baseConfidence = lengthFactor + positionBonus + fractalBonus;
    return Math.min(1.0, baseConfidence * (this.fractalWeight / PHI));
  }

  /**
   * Calcola score frattale usando pesi aurei
   */
  private calculateFractalScore(
    matches: PatternMatch['matches'],
    fractalPattern: FractalPattern,
    textLength: number
  ): number {
    if (matches.length === 0) return 0;

    const totalCoverage = matches.reduce((sum, m) => sum + (m.end - m.start), 0) / textLength;
    const avgConfidence = matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length;
    const levelWeight = fractalPattern.weight;
    const frequencyFactor = Math.min(1.0, matches.length / (PHI * 5));

    return totalCoverage * avgConfidence * levelWeight * frequencyFactor;
  }

  /**
   * Calcola rapporto aureo della distribuzione dei pattern
   */
  private calculateGoldenRatio(matches: PatternMatch['matches'], textLength: number): number {
    if (matches.length < 2) return 0;

    const positions = matches.map(m => m.start / textLength).sort((a, b) => a - b);
    let totalRatio = 0;

    for (let i = 1; i < positions.length; i++) {
      const segment1 = positions[i] - positions[i - 1];
      const segment2 = i + 1 < positions.length ? positions[i + 1] - positions[i] : 1 - positions[i];

      if (segment2 > 0) {
        const ratio = segment1 / segment2;
        const goldenDistance = Math.abs(ratio - PHI);
        const goldenScore = Math.max(0, 1 - goldenDistance);
        totalRatio += goldenScore;
      }
    }

    return totalRatio / (positions.length - 1);
  }

  /**
   * Crea segmenti frattali del testo
   */
  private createFractalSegments(text: string, maxDepth: number) {
    const segments: Array<{ text: string; level: number; start: number; end: number }> = [];

    for (let level = 1; level <= maxDepth; level++) {
      const segmentLength = Math.floor(text.length / Math.pow(PHI, level - 1));
      if (segmentLength < 20) break;

      for (let i = 0; i + segmentLength <= text.length; i += Math.floor(segmentLength * (1 / PHI))) {
        segments.push({
          text: text.slice(i, i + segmentLength),
          level,
          start: i,
          end: i + segmentLength
        });
      }
    }

    return segments;
  }

  /**
   * Estrae pattern auto-simili da un segmento
   */
  private extractSelfSimilarPatterns(text: string, level: number): PatternMatch[] {
    // Implementazione semplificata per pattern ricorrenti
    const words = text.toLowerCase().match(/\b\w{3,}\b/g) || [];
    const wordCounts = new Map<string, number>();

    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });

    const results: PatternMatch[] = [];
    const fibWeight = getFibonacciWeight(level);

    for (const [word, count] of wordCounts) {
      if (count >= 2) {
        const matches = this.findWordPositions(text, word);
        const score = (count / words.length) * fibWeight * PHI;

        results.push({
          pattern: `Ricorrente: "${word}"`,
          matches: matches.map(pos => ({
            start: pos,
            end: pos + word.length,
            text: word,
            confidence: Math.min(1.0, score),
            fractalDepth: level
          })),
          score: Math.round(score * 10000) / 10000,
          frequency: count,
          goldenRatio: 0
        });
      }
    }

    return results;
  }

  /**
   * Trova posizioni di una parola nel testo
   */
  private findWordPositions(text: string, word: string): number[] {
    const positions: number[] = [];
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      positions.push(match.index);
    }

    return positions;
  }

  /**
   * Merge pattern simili per ridurre ridondanza
   */
  private mergeSimilarPatterns(patterns: PatternMatch[]): PatternMatch[] {
    // Implementazione semplificata - raggruppa per pattern simili
    const merged = new Map<string, PatternMatch>();

    for (const pattern of patterns) {
      const key = pattern.pattern.split(':')[0]; // Usa la parte prima dei due punti come chiave

      if (merged.has(key)) {
        const existing = merged.get(key)!;
        existing.matches.push(...pattern.matches);
        existing.frequency += pattern.frequency;
        existing.score = Math.max(existing.score, pattern.score);
      } else {
        merged.set(key, { ...pattern });
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Divide testo in chunk di dimensione specifica
   */
  private chunkText(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Calcola l'unicità dei segmenti
   */
  private calculateUniqueness(segments: string[]): number {
    const uniqueSegments = new Set(segments);
    return uniqueSegments.size / segments.length;
  }
}

/**
 * Ottiene peso Fibonacci per livello
 */
function getFibonacciWeight(level: number): number {
  const index = Math.min(level - 1, FIB_SEQUENCE.length - 1);
  return FIB_SEQUENCE[index] || FIB_SEQUENCE[FIB_SEQUENCE.length - 1];
}

// --- CLI (solo quando eseguito via script npm con RUN_AS_CLI=1) ---
if (process.env.RUN_AS_CLI === '1') {
  (async () => {
    const fs = await import('node:fs/promises');
    const args = process.argv.slice(2);
    const jsonFlag = args.includes('--json');
    const recursiveFlag = args.includes('--recursive');
    const fractalFlag = args.includes('--fractal');
    const nonFlagArgs = args.filter(arg => !arg.startsWith('--'));

    const argPath = nonFlagArgs[0] && !isNaN(parseInt(nonFlagArgs[0])) ? undefined : nonFlagArgs[0];
    const maxDepth = nonFlagArgs.find(arg => !isNaN(parseInt(arg))) ? parseInt(nonFlagArgs.find(arg => !isNaN(parseInt(arg)))!) : 5;

    const input = argPath ? await fs.readFile(argPath, 'utf8') : await readStdin();
    const matcher = new GoldenPatternMatcher({ maxDepth });

    let results: PatternMatch[];
    if (recursiveFlag) {
      results = matcher.findRecursivePatterns(input, maxDepth);
    } else {
      results = matcher.findPatterns(input);
    }

    if (fractalFlag) {
      const dimension = matcher.calculateFractalDimension(input);
      console.log(`\n📐 Dimensione Frattale: ${dimension.toFixed(4)}\n`);
    }

    if (jsonFlag) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(`\n🔍 PATTERN FOUND (φ = ${PHI}):\n`);

      results.forEach((result, i) => {
        console.log(`${(i + 1).toString().padStart(2)}. ${result.pattern}`);
        console.log(`   Score: ${result.score.toFixed(4)} | Freq: ${result.frequency} | Golden: ${result.goldenRatio.toFixed(3)}`);

        result.matches.slice(0, 3).forEach((match, j) => {
          const preview = match.text.length > 40 ? match.text.slice(0, 37) + '...' : match.text;
          console.log(`   ${j + 1}. "${preview}" (conf: ${match.confidence.toFixed(3)}, depth: ${match.fractalDepth})`);
        });

        if (result.matches.length > 3) {
          console.log(`   ... e altri ${result.matches.length - 3} match`);
        }
        console.log();
      });
    }
  })();

  async function readStdin(): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const ch of process.stdin) chunks.push(Buffer.from(ch));
    return Buffer.concat(chunks).toString('utf8');
  }
}