import { describe, it, expect } from "vitest";
import { goldenSplit } from "./text-splitter";

const lorem = `Titolo

Paragrafo uno. Testo di prova con qualche frase.
Seconda frase per allungare il brodo. Terza frase.

- Punto elenco uno
- Punto elenco due

Chiusura del documento con una frase finale.`;

describe("goldenSplit", () => {
  it("produce almeno 3 sezioni su testo non triviale", () => {
    const s = goldenSplit(lorem);
    expect(s.length).toBeGreaterThanOrEqual(3);
  });
  it("decresce l'importanza ~ phi^-i", () => {
    const s = goldenSplit(lorem);
    for (let i = 1; i < s.length; i++) {
      expect(s[i].importance).toBeLessThan(s[i-1].importance);
    }
  });
});