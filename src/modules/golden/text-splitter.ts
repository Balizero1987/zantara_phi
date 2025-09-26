export const PHI = 1.618033988749895;

export type GoldenSection = {
  start: number;
  end: number;
  ratio: number;        // posizione di chiusura / lunghezza totale
  importance: number;   // ~ φ^-i
  content: string;
};

const FIB_RATIOS = [0.382, 0.618, 0.786, 0.854, 0.91, 0.944] as const;

type Cand = { index: number; weight: number };
function candidates(text: string): Cand[] {
  const out: Cand[] = [];
  const rules: Array<[RegExp, number]> = [
    [/\n{2,}/g, 1.0],                                      // paragrafi
    [/\n[-*•]\s+/g, 0.9],                                  // elenchi
    [/[.?!]\s+(?=[A-ZÀ-ÖØ-Ý0-9])/g, 0.75],                 // fine frase + maiuscola
    [/[,;:]\s+/g, 0.5]                                     // punteggiatura debole
  ];
  for (const [re, w] of rules) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      out.push({ index: m.index + m[0].length, weight: w });
    }
  }
  out.push({ index: text.length, weight: 0.2 });
  return out.sort((a, b) => a.index - b.index);
}

function pickBreak(cands: Cand[], target: number, total: number): number {
  const searchRadius = Math.max(40, Math.floor(total / (PHI * 10))); // ~3.8% del testo
  let best = target, bestScore = Number.POSITIVE_INFINITY;
  for (const c of cands) {
    const dist = Math.abs(c.index - target);
    if (dist <= searchRadius) {
      const score = dist / c.weight;
      if (score < bestScore && c.index > 0) {
        bestScore = score; best = c.index;
      }
    }
  }
  return Math.min(Math.max(best, 1), total);
}

export function goldenSplit(text: string, maxSections = FIB_RATIOS.length + 1): GoldenSection[] {
  const raw = text ?? "";
  const total = raw.length;
  if (!total) return [];

  const cands = candidates(raw);
  const sections: GoldenSection[] = [];
  let start = 0;

  for (let i = 0; i < Math.min(FIB_RATIOS.length, maxSections - 1); i++) {
    const target = Math.floor(total * FIB_RATIOS[i]);
    const end = Math.max(start + 1, pickBreak(cands, target, total));
    push(start, end, i);
    start = end;
  }
  push(start, total, sections.length);

  return sections;

  function push(s: number, e: number, i: number) {
    const content = raw.slice(s, e).trim();
    if (!content) return;
    const importance = Math.pow(1 / PHI, i);
    const ratio = e / total;
    sections.push({ start: s, end: e, ratio, importance, content });
  }
}

// --- CLI (solo quando eseguito via script npm con RUN_AS_CLI=1) ---
if (process.env.RUN_AS_CLI === '1') {
  (async () => {
    const fs = await import('node:fs/promises');
    const argPath = process.argv[2];
    const mode = process.argv.includes('--json') ? 'json' : 'pretty';
    const input = argPath ? await fs.readFile(argPath, 'utf8') : await readStdin();
    const secs = goldenSplit(input);
    if (mode === 'json') {
      console.log(JSON.stringify(secs, null, 2));
    } else {
      secs.forEach((s, i) => {
        const preview = s.content.replace(/\s+/g, ' ').slice(0, 120);
        console.log(`#${i + 1}  ratio=${(s.ratio * 100).toFixed(1)}%  imp≈${s.importance.toFixed(3)}  ${preview}${s.content.length > 120 ? '…' : ''}`);
      });
    }
  })();

  async function readStdin(): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const ch of process.stdin) chunks.push(Buffer.from(ch));
    return Buffer.concat(chunks).toString('utf8');
  }
}