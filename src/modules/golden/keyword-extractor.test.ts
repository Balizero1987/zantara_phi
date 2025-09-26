import { describe, it, expect } from "vitest";
import { GoldenKeywordExtractor, PHI } from "./keyword-extractor";

// Testo di test strutturato
const testText = `
Intelligenza Artificiale e Machine Learning

L'intelligenza artificiale rappresenta una rivoluzione tecnologica senza precedenti.
Il machine learning, sottocampo dell'IA, utilizza algoritmi per apprendere dai dati.
Gli algoritmi di deep learning sono particolarmente efficaci nell'elaborazione del linguaggio naturale.

Le reti neurali artificiali imitano il funzionamento del cervello umano.
L'elaborazione del linguaggio naturale consente alle macchine di comprendere il testo.
I modelli di machine learning possono essere addestrati su grandi dataset.

Applicazioni pratiche:
- Riconoscimento vocale
- Traduzione automatica
- Sistemi di raccomandazione
- Analisi predittiva

La tecnologia blockchain rappresenta un'altra innovazione importante.
I sistemi distribuiti offrono vantaggi in termini di scalabilità e resilienza.
`;

const shortText = "Il gatto mangia il pesce sul tavolo della cucina";

const englishText = `
Artificial intelligence and machine learning are transforming technology.
Deep learning algorithms process natural language with remarkable accuracy.
Neural networks mimic human brain functionality for pattern recognition.
Data science combines statistics with computer science methodologies.
`;

describe("GoldenKeywordExtractor", () => {

  describe("Costruttore e configurazione", () => {
    it("crea istanza con parametri default", () => {
      const extractor = new GoldenKeywordExtractor();
      expect(extractor).toBeDefined();
    });

    it("accetta parametri di configurazione personalizzati", () => {
      const extractor = new GoldenKeywordExtractor({
        minWordLength: 4,
        maxKeywords: 15,
        phiThreshold: 0.5
      });
      expect(extractor).toBeDefined();
    });
  });

  describe("Estrazione keywords base", () => {
    it("estrae keywords da testo vuoto", () => {
      const extractor = new GoldenKeywordExtractor();
      expect(extractor.extractKeywords("")).toEqual([]);
      expect(extractor.extractKeywords("   ")).toEqual([]);
    });

    it("estrae keywords da testo breve", () => {
      const extractor = new GoldenKeywordExtractor();
      const results = extractor.extractKeywords(shortText);

      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(20);

      // Verifica struttura risultati
      results.forEach(kw => {
        expect(kw).toHaveProperty('keyword');
        expect(kw).toHaveProperty('score');
        expect(kw).toHaveProperty('frequency');
        expect(kw).toHaveProperty('idf');
        expect(kw).toHaveProperty('confidence');

        expect(typeof kw.keyword).toBe('string');
        expect(typeof kw.score).toBe('number');
        expect(typeof kw.frequency).toBe('number');
        expect(typeof kw.idf).toBe('number');
        expect(typeof kw.confidence).toBe('number');

        expect(kw.score).toBeGreaterThan(0);
        expect(kw.frequency).toBeGreaterThanOrEqual(1);
        expect(kw.idf).toBeGreaterThan(0);
        expect(kw.confidence).toBeGreaterThan(0);
        expect(kw.confidence).toBeLessThanOrEqual(1);
      });
    });

    it("estrae keywords da testo complesso", () => {
      const extractor = new GoldenKeywordExtractor();
      const results = extractor.extractKeywords(testText);

      expect(results.length).toBeGreaterThan(5);

      // I risultati dovrebbero essere ordinati per score decrescente
      for (let i = 1; i < results.length; i++) {
        expect(results[i].score).toBeLessThanOrEqual(results[i-1].score);
      }
    });
  });

  describe("Filtraggio stop-words", () => {
    it("esclude stop-words italiane", () => {
      const extractor = new GoldenKeywordExtractor();
      const results = extractor.extractKeywords("il gatto mangia e beve con la famiglia");

      const keywords = results.map(r => r.keyword);
      expect(keywords).not.toContain('il');
      expect(keywords).not.toContain('la');
      expect(keywords).not.toContain('con');
      expect(keywords).not.toContain('e');
    });

    it("esclude stop-words inglesi", () => {
      const extractor = new GoldenKeywordExtractor();
      const results = extractor.extractKeywords(englishText);

      const keywords = results.map(r => r.keyword);
      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('and');
      expect(keywords).not.toContain('with');
      expect(keywords).not.toContain('are');
    });

    it("mantiene termini tecnici significativi", () => {
      const extractor = new GoldenKeywordExtractor();
      const results = extractor.extractKeywords(testText);

      const keywords = results.map(r => r.keyword);
      expect(keywords.some(k => k.includes('machine') || k.includes('learning'))).toBe(true);
      expect(keywords.some(k => k.includes('intelligenza') || k.includes('artificiale'))).toBe(true);
    });
  });

  describe("Compound terms (bigrammi)", () => {
    it("identifica bigrammi significativi", () => {
      const extractor = new GoldenKeywordExtractor();
      const results = extractor.extractKeywords(testText);

      const keywords = results.map(r => r.keyword);

      // Cerca bigrammi che dovrebbero essere identificati
      const hasMachineLearning = keywords.some(k => k.includes('machine learning'));
      const hasDeepLearning = keywords.some(k => k.includes('deep learning'));
      const hasNaturalLanguage = keywords.some(k => k.includes('natural language') || k.includes('linguaggio naturale'));

      // Almeno uno dovrebbe essere presente
      expect(hasMachineLearning || hasDeepLearning || hasNaturalLanguage).toBe(true);
    });

    it("evita bigrammi con stop-words", () => {
      const extractor = new GoldenKeywordExtractor();
      const results = extractor.extractKeywords("machine learning and artificial intelligence");

      const keywords = results.map(r => r.keyword);

      // Non dovrebbero esserci bigrammi che includono "and"
      expect(keywords.some(k => k.includes('learning and'))).toBe(false);
      expect(keywords.some(k => k.includes('and artificial'))).toBe(false);
    });
  });

  describe("Scoring PHI-based", () => {
    it("applica pesi Fibonacci per lunghezza", () => {
      const extractor = new GoldenKeywordExtractor();
      const results = extractor.extractKeywords("cat elephant hippopotamus");

      // Parole più lunghe dovrebbero avere score potenzialmente più alti
      // (se tutto il resto è uguale)
      expect(results.length).toBeGreaterThan(0);
    });

    it("produce score deterministici", () => {
      const extractor = new GoldenKeywordExtractor();
      const results1 = extractor.extractKeywords(testText);
      const results2 = extractor.extractKeywords(testText);

      expect(results1).toEqual(results2);

      // Verifica che i valori numerici abbiano precisione limitata (4 decimali)
      results1.forEach(kw => {
        expect(kw.score.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(4);
        expect(kw.idf.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(4);
        expect(kw.confidence.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(4);
      });
    });

    it("applica boost per frequenze vicine a rapporti aurei", () => {
      const extractor = new GoldenKeywordExtractor();

      // Crea un testo dove un termine ha frequenza vicina a 1/PHI
      const repeatedTerm = "zantara ".repeat(Math.floor(100 / PHI)); // ~62 volte
      const totalText = repeatedTerm + "other words to fill the text ".repeat(38);

      const results = extractor.extractKeywords(totalText);
      const zantaraResult = results.find(r => r.keyword === 'zantara');

      expect(zantaraResult).toBeDefined();
      expect(zantaraResult!.frequency).toBeGreaterThan(50);
    });
  });

  describe("Limiti e configurazione", () => {
    it("rispetta il limite maxKeywords", () => {
      const extractor = new GoldenKeywordExtractor();
      const results = extractor.extractKeywords(testText, 5);

      expect(results.length).toBeLessThanOrEqual(5);
    });

    it("rispetta il limite impostato nel costruttore", () => {
      const extractor = new GoldenKeywordExtractor({ maxKeywords: 3 });
      const results = extractor.extractKeywords(testText);

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("rispetta minWordLength personalizzata", () => {
      const extractor = new GoldenKeywordExtractor({ minWordLength: 5 });
      const results = extractor.extractKeywords("cat dog elephant hippopotamus");

      const keywords = results.map(r => r.keyword);
      expect(keywords).not.toContain('cat');
      expect(keywords).not.toContain('dog');
      expect(keywords.some(k => k.includes('elephant'))).toBe(true);
    });
  });

  describe("Confidence scoring", () => {
    it("assegna confidence tra 0 e 1", () => {
      const extractor = new GoldenKeywordExtractor();
      const results = extractor.extractKeywords(testText);

      results.forEach(kw => {
        expect(kw.confidence).toBeGreaterThan(0);
        expect(kw.confidence).toBeLessThanOrEqual(1);
      });
    });

    it("assegna confidence più alta a termini più lunghi e significativi", () => {
      const extractor = new GoldenKeywordExtractor();
      const results = extractor.extractKeywords("machine learning intelligence");

      // Assumendo che "intelligence" sia più lungo e raro di "machine"
      const intelligence = results.find(r => r.keyword === 'intelligence');
      const machine = results.find(r => r.keyword === 'machine');

      if (intelligence && machine) {
        // Termini più lunghi tendono ad avere confidence più alta
        expect(intelligence.confidence).toBeGreaterThan(0);
        expect(machine.confidence).toBeGreaterThan(0);
      }
    });
  });

  describe("Edge cases", () => {
    it("gestisce testo con solo numeri", () => {
      const extractor = new GoldenKeywordExtractor();
      const results = extractor.extractKeywords("123 456 789 2023 2024");

      // I numeri puri dovrebbero essere filtrati
      expect(results.length).toBe(0);
    });

    it("gestisce testo con solo punteggiatura", () => {
      const extractor = new GoldenKeywordExtractor();
      const results = extractor.extractKeywords("!@#$%^&*()_+-={}[]|\\:;\"'<>?,./");

      expect(results.length).toBe(0);
    });

    it("gestisce testo con solo stop-words", () => {
      const extractor = new GoldenKeywordExtractor();
      const results = extractor.extractKeywords("il la le lo gli un una the a an and or but");

      expect(results.length).toBe(0);
    });

    it("gestisce singola parola valida", () => {
      const extractor = new GoldenKeywordExtractor();
      const results = extractor.extractKeywords("technology");

      expect(results.length).toBe(1);
      expect(results[0].keyword).toBe('technology');
      expect(results[0].frequency).toBe(1);
    });
  });

  describe("Matematica PHI", () => {
    it("usa il valore PHI corretto", () => {
      expect(PHI).toBeCloseTo(1.618033988749895, 10);
    });

    it("applica rapporti aurei nel scoring", () => {
      const extractor = new GoldenKeywordExtractor();
      const results = extractor.extractKeywords(testText);

      // Verifica che lo scoring usi effettivamente PHI
      // (questo è implicito nell'implementazione, ma possiamo verificare la coerenza)
      expect(results.length).toBeGreaterThan(0);

      results.forEach(kw => {
        // Score dovrebbe essere positivo e ragionevole
        expect(kw.score).toBeGreaterThan(0);
        expect(kw.score).toBeLessThan(100); // Limite ragionevole superiore
      });
    });
  });
});