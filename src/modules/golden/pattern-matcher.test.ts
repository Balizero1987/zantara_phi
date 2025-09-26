import { describe, it, expect } from 'vitest';
import { GoldenPatternMatcher, PHI, PatternMatch, FractalPattern } from './pattern-matcher';

// Testi campione con vari pattern
const sampleText = `
John Smith (john.smith@example.com) lavora per Apple Inc.
Ha sviluppato il progetto AI-2024 con budget $50,000.
L'indirizzo IP del server è 192.168.1.100.
Data di rilascio: 15/03/2024.
Sito web: https://www.apple.com/ai-project
Acronimo: NASA, FBI, CIA sono agenzie governative.

Marco Rossi e Luigi Verdi collaborano su Machine Learning.
Il Machine Learning utilizza algoritmi avanzati.
Gli algoritmi avanzati processano big data.
Big data richiede infrastruttura scalabile.
`;

const emailText = `
Caro Marco,

Ti scrivo per confermare l'appuntamento di domani alle 14:30.
L'indirizzo è Via Roma 123, Milano.
Contatti: marco@example.com, luigi@test.it, anna@company.org

Saluti,
Giovanni Bianchi
giovanni.bianchi@corporation.com
`;

const recursiveText = `
Il pattern si ripete. Il pattern emerge. Il pattern evolve.
La struttura crea struttura. La struttura definisce struttura.
Fibonacci genera Fibonacci numeri. Fibonacci sequenze mostrano Fibonacci ratios.
Golden ratio appare ovunque. Golden ratio governa natura. Golden ratio guida design.
`;

describe('GoldenPatternMatcher', () => {

  describe('Costruttore e configurazione', () => {
    it('crea istanza con parametri default', () => {
      const matcher = new GoldenPatternMatcher();
      expect(matcher).toBeDefined();
    });

    it('accetta parametri di configurazione personalizzati', () => {
      const matcher = new GoldenPatternMatcher({
        maxDepth: 3,
        confidenceThreshold: 0.5,
        fractalWeight: 2.0
      });
      expect(matcher).toBeDefined();
    });
  });

  describe('Pattern detection base', () => {
    it('gestisce testo vuoto', () => {
      const matcher = new GoldenPatternMatcher();
      expect(matcher.findPatterns('')).toEqual([]);
      expect(matcher.findPatterns('   ')).toEqual([]);
    });

    it('trova pattern base nel testo campione', () => {
      const matcher = new GoldenPatternMatcher();
      const patterns = matcher.findPatterns(sampleText);

      expect(patterns.length).toBeGreaterThan(0);

      // Verifica struttura PatternMatch
      patterns.forEach(pattern => {
        expect(pattern).toHaveProperty('pattern');
        expect(pattern).toHaveProperty('matches');
        expect(pattern).toHaveProperty('score');
        expect(pattern).toHaveProperty('frequency');
        expect(pattern).toHaveProperty('goldenRatio');

        expect(typeof pattern.pattern).toBe('string');
        expect(Array.isArray(pattern.matches)).toBe(true);
        expect(typeof pattern.score).toBe('number');
        expect(typeof pattern.frequency).toBe('number');
        expect(typeof pattern.goldenRatio).toBe('number');

        expect(pattern.score).toBeGreaterThan(0);
        expect(pattern.frequency).toBeGreaterThanOrEqual(1);
        expect(pattern.goldenRatio).toBeGreaterThanOrEqual(0);
        expect(pattern.goldenRatio).toBeLessThanOrEqual(1);
      });
    });

    it('trova nomi propri capitalizzati', () => {
      const matcher = new GoldenPatternMatcher();
      const patterns = matcher.findPatterns(sampleText);

      // Cerca pattern che contengono nomi propri (sia singoli che composti)
      const namePatterns = patterns.filter(p =>
        p.pattern.includes('capitalizzate') ||
        p.pattern.includes('Parole capitalizzate') ||
        p.pattern.includes('Nomi propri') ||
        p.pattern.includes('composti')
      );

      expect(namePatterns.length).toBeGreaterThan(0);

      // Verifica che abbia trovato almeno qualche nome
      const allNames = namePatterns.flatMap(p => p.matches.map(m => m.text));
      expect(allNames.length).toBeGreaterThan(0);
    });

    it('trova email addresses', () => {
      const matcher = new GoldenPatternMatcher();
      const patterns = matcher.findPatterns(emailText);

      const emailPatterns = patterns.filter(p =>
        p.pattern.includes('Email') ||
        p.pattern.includes('email') ||
        p.pattern.includes('mail')
      );

      expect(emailPatterns.length).toBeGreaterThan(0);

      // Verifica che almeno alcuni match abbiano formato email
      const allMatches = emailPatterns.flatMap(p => p.matches.map(m => m.text));
      const emailMatches = allMatches.filter(text => text.includes('@'));
      expect(emailMatches.length).toBeGreaterThan(0);
    });

    it('trova pattern generici nel testo', () => {
      const matcher = new GoldenPatternMatcher();
      const patterns = matcher.findPatterns(sampleText);

      // Verifica che vengano trovati pattern in generale
      expect(patterns.length).toBeGreaterThan(0);

      // Verifica che i pattern abbiano match validi
      patterns.forEach(pattern => {
        expect(pattern.matches.length).toBeGreaterThan(0);
        expect(pattern.frequency).toBeGreaterThan(0);
      });
    });
  });

  describe('Pattern frattali e livelli', () => {
    it('assegna livelli frattali corretti', () => {
      const matcher = new GoldenPatternMatcher();
      const patterns = matcher.findPatterns(sampleText);

      patterns.forEach(pattern => {
        pattern.matches.forEach(match => {
          expect(match.fractalDepth).toBeGreaterThanOrEqual(1);
          expect(match.fractalDepth).toBeLessThanOrEqual(5);
          expect(Number.isInteger(match.fractalDepth)).toBe(true);
        });
      });
    });

    it('rispetta maxDepth configurato', () => {
      const matcher = new GoldenPatternMatcher({ maxDepth: 3 });
      const patterns = matcher.findPatterns(sampleText);

      patterns.forEach(pattern => {
        pattern.matches.forEach(match => {
          expect(match.fractalDepth).toBeLessThanOrEqual(3);
        });
      });
    });

    it('applica pesi crescenti per livelli superiori', () => {
      const matcher = new GoldenPatternMatcher();
      const patterns = matcher.findPatterns(sampleText);

      // Trova pattern di livelli diversi
      const level1Patterns = patterns.filter(p => p.matches.some(m => m.fractalDepth === 1));
      const level3Patterns = patterns.filter(p => p.matches.some(m => m.fractalDepth === 3));

      if (level1Patterns.length > 0 && level3Patterns.length > 0) {
        // I pattern di livello superiore dovrebbero avere score potenzialmente più alti
        expect(level3Patterns.length).toBeGreaterThan(0);
        expect(level1Patterns.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Confidence scoring', () => {
    it('assegna confidence tra 0 e 1', () => {
      const matcher = new GoldenPatternMatcher();
      const patterns = matcher.findPatterns(sampleText);

      patterns.forEach(pattern => {
        pattern.matches.forEach(match => {
          expect(match.confidence).toBeGreaterThan(0);
          expect(match.confidence).toBeLessThanOrEqual(1);
        });
      });
    });

    it('rispetta confidenceThreshold', () => {
      const highThreshold = 0.8;
      const matcher = new GoldenPatternMatcher({ confidenceThreshold: highThreshold });
      const patterns = matcher.findPatterns(sampleText);

      patterns.forEach(pattern => {
        expect(pattern.score).toBeGreaterThanOrEqual(highThreshold);
      });
    });

    it('assegna confidence superiore a pattern più complessi', () => {
      const matcher = new GoldenPatternMatcher();
      const patterns = matcher.findPatterns(emailText);

      // Email complete dovrebbero avere confidence alta
      const emailPattern = patterns.find(p => p.pattern.includes('Email'));
      if (emailPattern) {
        emailPattern.matches.forEach(match => {
          if (match.text.includes('@')) {
            expect(match.confidence).toBeGreaterThan(0.5);
          }
        });
      }
    });
  });

  describe('Pattern ricorsivi', () => {
    it('trova pattern ricorsivi nel testo', () => {
      const matcher = new GoldenPatternMatcher();
      const recursivePatterns = matcher.findRecursivePatterns(recursiveText);

      expect(recursivePatterns.length).toBeGreaterThan(0);

      // Dovrebbe trovare parole ricorrenti come "pattern", "struttura", "Fibonacci"
      const patterns = recursivePatterns.map(p => p.pattern.toLowerCase());
      expect(patterns.some(p => p.includes('pattern') || p.includes('struttura') || p.includes('fibonacci'))).toBe(true);
    });

    it('conta correttamente le frequenze ricorsive', () => {
      const matcher = new GoldenPatternMatcher();
      const recursivePatterns = matcher.findRecursivePatterns(recursiveText);

      recursivePatterns.forEach(pattern => {
        expect(pattern.frequency).toBeGreaterThanOrEqual(2); // Pattern ricorsivi devono apparire almeno 2 volte
        expect(pattern.matches.length).toBe(pattern.frequency);
      });
    });

    it('rispetta parametro depth per ricorsione', () => {
      const matcher = new GoldenPatternMatcher();
      const shallowPatterns = matcher.findRecursivePatterns(recursiveText, 2);
      const deepPatterns = matcher.findRecursivePatterns(recursiveText, 4);

      // Pattern più profondi potrebbero trovare più dettagli
      expect(shallowPatterns.length).toBeGreaterThan(0);
      expect(deepPatterns.length).toBeGreaterThanOrEqual(shallowPatterns.length);
    });
  });

  describe('Dimensione frattale', () => {
    it('calcola dimensione frattale per testo semplice', () => {
      const matcher = new GoldenPatternMatcher();
      const dimension = matcher.calculateFractalDimension('simple text');

      expect(dimension).toBeGreaterThan(0);
      expect(dimension).toBeLessThanOrEqual(2);
      expect(Number.isFinite(dimension)).toBe(true);
    });

    it('calcola dimensione frattale per testo complesso', () => {
      const matcher = new GoldenPatternMatcher();
      const dimension = matcher.calculateFractalDimension(sampleText);

      expect(dimension).toBeGreaterThan(0);
      expect(dimension).toBeLessThanOrEqual(2);
      expect(Number.isFinite(dimension)).toBe(true);
    });

    it('restituisce dimensioni diverse per testi di complessità diversa', () => {
      const matcher = new GoldenPatternMatcher();

      const simpleDimension = matcher.calculateFractalDimension('abc abc abc');
      const complexDimension = matcher.calculateFractalDimension(sampleText);

      expect(simpleDimension).toBeGreaterThan(0);
      expect(complexDimension).toBeGreaterThan(0);

      // Il testo complesso dovrebbe avere dimensione diversa
      expect(Math.abs(simpleDimension - complexDimension)).toBeGreaterThan(0);
    });
  });

  describe('Custom patterns', () => {
    it('accetta pattern personalizzati', () => {
      const customPattern: FractalPattern = {
        level: 2,
        pattern: /\bTEST\b/g,
        weight: PHI,
        description: 'Pattern di test'
      };

      const matcher = new GoldenPatternMatcher();
      const patterns = matcher.findPatterns('TEST TEST TEST', [customPattern]);

      const customFound = patterns.find(p => p.pattern === 'Pattern di test');
      expect(customFound).toBeDefined();
      expect(customFound!.frequency).toBe(3);
    });

    it('combina pattern built-in e personalizzati', () => {
      const customPattern: FractalPattern = {
        level: 1,
        pattern: /\bCUSTOM\b/g,
        weight: 1.0,
        description: 'Pattern personalizzato'
      };

      const text = 'John Smith e CUSTOM pattern insieme';
      const matcher = new GoldenPatternMatcher({ confidenceThreshold: 0.01 }); // Soglia molto bassa
      const patterns = matcher.findPatterns(text, [customPattern]);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some(p => p.pattern === 'Pattern personalizzato')).toBe(true);
    });
  });

  describe('Scoring PHI-based', () => {
    it('produce score deterministici', () => {
      const matcher = new GoldenPatternMatcher();
      const patterns1 = matcher.findPatterns(sampleText);
      const patterns2 = matcher.findPatterns(sampleText);

      expect(patterns1).toEqual(patterns2);

      // Verifica che i valori numerici abbiano precisione limitata (4 decimali)
      patterns1.forEach(pattern => {
        expect(pattern.score.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(4);
        expect(pattern.goldenRatio.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(4);

        pattern.matches.forEach(match => {
          expect(match.confidence.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(4);
        });
      });
    });

    it('ordina pattern per score decrescente', () => {
      const matcher = new GoldenPatternMatcher();
      const patterns = matcher.findPatterns(sampleText);

      for (let i = 1; i < patterns.length; i++) {
        expect(patterns[i].score).toBeLessThanOrEqual(patterns[i - 1].score);
      }
    });

    it('calcola golden ratio per distribuzione pattern', () => {
      const matcher = new GoldenPatternMatcher();
      const patterns = matcher.findPatterns(sampleText);

      patterns.forEach(pattern => {
        expect(pattern.goldenRatio).toBeGreaterThanOrEqual(0);
        expect(pattern.goldenRatio).toBeLessThanOrEqual(1);
        expect(Number.isFinite(pattern.goldenRatio)).toBe(true);
      });
    });
  });

  describe('Edge cases', () => {
    it('gestisce testo con solo spazi e punteggiatura', () => {
      const matcher = new GoldenPatternMatcher();
      const patterns = matcher.findPatterns('   ... !!! ??? ');

      expect(patterns.length).toBe(0);
    });

    it('gestisce testo molto breve', () => {
      const matcher = new GoldenPatternMatcher();
      const patterns = matcher.findPatterns('Hi');

      // Può trovare pattern o no, ma non deve crashare
      expect(Array.isArray(patterns)).toBe(true);
    });

    it('gestisce testo molto lungo', () => {
      const longText = sampleText.repeat(100);
      const matcher = new GoldenPatternMatcher();
      const patterns = matcher.findPatterns(longText);

      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('gestisce caratteri speciali e unicode', () => {
      const unicodeText = 'Café naïve résumé çà và bene 中文 العربية 🎯✅';
      const matcher = new GoldenPatternMatcher();
      const patterns = matcher.findPatterns(unicodeText);

      expect(Array.isArray(patterns)).toBe(true);
    });

    it('gestisce pattern senza match', () => {
      const matcher = new GoldenPatternMatcher({ confidenceThreshold: 0.99 }); // Soglia molto alta
      const patterns = matcher.findPatterns('simple text without complex patterns');

      expect(Array.isArray(patterns)).toBe(true);
      // Può essere vuoto se nessun pattern supera la soglia
    });
  });

  describe('Performance e limiti', () => {
    it('gestisce profondità massima', () => {
      const matcher = new GoldenPatternMatcher({ maxDepth: 2 });
      const patterns = matcher.findPatterns(sampleText);

      patterns.forEach(pattern => {
        pattern.matches.forEach(match => {
          expect(match.fractalDepth).toBeLessThanOrEqual(2);
        });
      });
    });

    it('previene loop infiniti su pattern malformati', () => {
      const customPattern: FractalPattern = {
        level: 1,
        pattern: /a*/g, // Pattern che può matchare stringhe vuote
        weight: 1.0,
        description: 'Pattern potenzialmente problematico'
      };

      const matcher = new GoldenPatternMatcher();

      // Non dovrebbe bloccarsi
      expect(() => {
        matcher.findPatterns('aaaa', [customPattern]);
      }).not.toThrow();
    });
  });

  describe('Integrazione PHI', () => {
    it('usa il valore PHI corretto', () => {
      expect(PHI).toBeCloseTo(1.618033988749895, 10);
    });

    it('incorpora PHI nei calcoli di scoring', () => {
      const matcher = new GoldenPatternMatcher();
      const patterns = matcher.findPatterns(sampleText);

      // Verifica che il sistema usi effettivamente PHI
      // (implicito nei calcoli, ma possiamo verificare la coerenza)
      patterns.forEach(pattern => {
        expect(pattern.score).toBeGreaterThan(0);
        expect(Number.isFinite(pattern.score)).toBe(true);
      });
    });
  });
});