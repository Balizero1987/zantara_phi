const PHI = 1.618033988749895;
const FIB_WEIGHTS = [1, 1, 2, 3, 5, 8, 13, 21];

const DOCUMENT_TYPES = ["invoice", "email", "contract", "report", "letter"] as const;
const BASE_BIAS = 1 / (PHI * 4); // Small neutral bias to avoid runaway categories
const LETTER_BIAS = 1 / (PHI * 2);
export type DocumentType = typeof DOCUMENT_TYPES[number];

export type ClassificationScores = Record<DocumentType, number>;

export type ClassificationFeature = {
  category: DocumentType;
  description: string;
  weight: number;
};

export type ClassificationResult = {
  type: DocumentType;
  confidence: number;
  scores: ClassificationScores;
  ranked: Array<{ type: DocumentType; score: number }>;
  features: ClassificationFeature[]; // All features across categories
  matchedFeatures: ClassificationFeature[]; // Features for predicted category
};

type SignalMatch = {
  weight: number;
  description: string;
};

type SignalEvaluator = (ctx: ClassificationContext) => SignalMatch | null;

type CategoryConfig = {
  id: DocumentType;
  bias: number;
  signals: SignalEvaluator[];
};

type ClassificationContext = {
  original: string;
  normalized: string;
  lower: string;
  tokens: string[];
  lines: string[];
  metrics: ContextMetrics;
};

type ContextMetrics = {
  tokenCount: number;
  numericTokenRatio: number;
  currencyCount: number;
  invoiceNumberCount: number;
  emailCount: number;
  urlCount: number;
  bulletCount: number;
  uppercaseHeadingCount: number;
  greetingLines: number;
  closingLines: number;
  signatureLines: number;
  subjectLines: number;
  headerLines: number;
  sectionKeywordLines: number;
  legalClauseCount: number;
  legalAllCapsCount: number;
  financialSummaryLines: number;
  dateLines: number;
  itemizedLines: number;
  referenceNumbers: number;
  conclusionLines: number;
  lineCount: number;
  charLength: number;
  attachments: number;
};

const w = (fib: number) => fib / PHI;

function keywordSignal(pattern: RegExp, weight: number, label: string): SignalEvaluator {
  return (ctx) => {
    const matches = ctx.lower.match(pattern);
    if (!matches) return null;
    const intensity = Math.min(matches.length, FIB_WEIGHTS.length);
    const adjusted = weight * (1 + (intensity - 1) / (PHI * 2));
    return {
      weight: roundWeight(adjusted),
      description: `${label} (${matches.length})`
    };
  };
}

function metricSignal(
  extractor: (ctx: ClassificationContext) => number,
  threshold: number,
  weight: number,
  label: string
): SignalEvaluator {
  return (ctx) => {
    const value = extractor(ctx);
    if (value < threshold) return null;
    const intensity = Math.min(value / threshold, PHI);
    const adjusted = weight * intensity;
    return {
      weight: roundWeight(adjusted),
      description: `${label} (${value})`
    };
  };
}

function absenceSignal(
  extractor: (ctx: ClassificationContext) => number,
  maxValue: number,
  weight: number,
  label: string
): SignalEvaluator {
  return (ctx) => {
    if (ctx.metrics.tokenCount < 4 || ctx.metrics.charLength < 40) {
      return null;
    }
    const value = extractor(ctx);
    if (value > maxValue) return null;
    return {
      weight: roundWeight(weight * (1 + (maxValue - value) / (PHI * 5))),
      description: `${label} (≤ ${maxValue})`
    };
  };
}

function ratioSignal(
  numerator: (ctx: ClassificationContext) => number,
  denominator: (ctx: ClassificationContext) => number,
  minRatio: number,
  weight: number,
  label: string
): SignalEvaluator {
  return (ctx) => {
    const num = numerator(ctx);
    const den = denominator(ctx);
    if (den === 0) return null;
    const ratio = num / den;
    if (ratio < minRatio) return null;
    const adjusted = weight * Math.min(ratio / minRatio, PHI);
    return {
      weight: roundWeight(adjusted),
      description: `${label} (ratio ${(ratio * 100).toFixed(1)}%)`
    };
  };
}

const CATEGORY_CONFIGS: CategoryConfig[] = [
  {
    id: "invoice",
    bias: BASE_BIAS,
    signals: [
      keywordSignal(/\binvoice\b/g, w(13), "Keyword 'invoice'"),
      keywordSignal(/\bbill(?:ing)?\b/g, w(8), "Billing vocabulary"),
      keywordSignal(/\b(?:due date|due on|net\s*\d{1,3})\b/g, w(8), "Due date references"),
      keywordSignal(/\b(?:subtotal|total|amount due|balance due|tax|vat)\b/g, w(8), "Financial summary wording"),
      metricSignal((ctx) => ctx.metrics.currencyCount, 2, w(13), "Multiple currency mentions"),
      metricSignal((ctx) => ctx.metrics.invoiceNumberCount, 1, w(13), "Invoice number detected"),
      ratioSignal((ctx) => ctx.metrics.numericTokenRatio, () => 1, 0.18, w(8), "High numeric density"),
      metricSignal((ctx) => ctx.metrics.itemizedLines, 2, w(8), "Itemized table lines"),
      metricSignal((ctx) => ctx.metrics.financialSummaryLines, 2, w(8), "Totals summary lines")
    ]
  },
  {
    id: "email",
    bias: BASE_BIAS,
    signals: [
      keywordSignal(/\bsubject\b/g, w(8), "Subject header"),
      keywordSignal(/\b(?:hi|hello|hey|ciao)\b/g, w(8), "Casual salutation"),
      keywordSignal(/\b(?:regards|sincerely|thanks|cheers|best)\b/g, w(8), "Closing phrase"),
      metricSignal((ctx) => ctx.metrics.emailCount, 1, w(13), "Email addresses"),
      metricSignal((ctx) => ctx.metrics.headerLines, 1, w(13), "Email header block"),
      metricSignal((ctx) => ctx.metrics.greetingLines, 1, w(8), "Greeting line"),
      metricSignal((ctx) => ctx.metrics.closingLines, 1, w(8), "Closing line"),
      metricSignal((ctx) => ctx.metrics.attachments, 1, w(5), "Attachment hint"),
      metricSignal((ctx) => ctx.metrics.urlCount, 1, w(5), "Links present"),
      absenceSignal((ctx) => ctx.metrics.legalClauseCount, 1, w(5), "Minimal legal clauses")
    ]
  },
  {
    id: "contract",
    bias: BASE_BIAS,
    signals: [
      keywordSignal(/\b(?:agreement|contract|party|parties|hereby|herein|whereas)\b/g, w(13), "Legal register"),
      keywordSignal(/\b(?:governing law|liability|confidentiality|witnesseth|indemnify)\b/g, w(13), "Contract clauses"),
      metricSignal((ctx) => ctx.metrics.legalClauseCount, 3, w(13), "Numerous legal clauses"),
      metricSignal((ctx) => ctx.metrics.legalAllCapsCount, 1, w(8), "All-caps section headings"),
      metricSignal((ctx) => ctx.metrics.dateLines, 1, w(5), "Effective date"),
      metricSignal((ctx) => ctx.metrics.signatureLines, 1, w(5), "Signature block"),
      absenceSignal((ctx) => ctx.metrics.headerLines, 0, w(5), "No email header block"),
      metricSignal((ctx) => ctx.metrics.referenceNumbers, 1, w(5), "Reference identifiers")
    ]
  },
  {
    id: "report",
    bias: BASE_BIAS,
    signals: [
      keywordSignal(/\b(?:report|summary|analysis|findings|results|overview|insights)\b/g, w(8), "Analytical vocabulary"),
      metricSignal((ctx) => ctx.metrics.sectionKeywordLines, 2, w(8), "Structured sections"),
      metricSignal((ctx) => ctx.metrics.bulletCount, 1, w(8), "Bullet lists"),
      metricSignal((ctx) => ctx.metrics.uppercaseHeadingCount, 1, w(5), "Uppercase headings"),
      metricSignal((ctx) => ctx.metrics.conclusionLines, 1, w(8), "Conclusion / next steps"),
      ratioSignal((ctx) => ctx.metrics.numericTokenRatio, () => 1, 0.08, w(5), "Quantitative references")
    ]
  },
  {
    id: "letter",
    bias: LETTER_BIAS,
    signals: [
      keywordSignal(/\b(?:dear|greetings)\b/g, w(8), "Personal salutation"),
      keywordSignal(/\b(?:sincerely|yours truly|kind regards|warm regards)\b/g, w(8), "Formal closing"),
      metricSignal((ctx) => ctx.metrics.greetingLines, 1, w(8), "Greeting line"),
      metricSignal((ctx) => ctx.metrics.closingLines, 1, w(8), "Closing line"),
      metricSignal((ctx) => ctx.metrics.signatureLines, 1, w(5), "Signature block"),
      metricSignal((ctx) => ctx.metrics.dateLines, 1, w(5), "Date reference"),
      absenceSignal((ctx) => ctx.metrics.headerLines, 0, w(5), "No email routing headers"),
      absenceSignal((ctx) => ctx.metrics.currencyCount, 1, w(3), "Limited financial jargon"),
      absenceSignal((ctx) => ctx.metrics.legalClauseCount, 1, w(3), "Limited legal jargon"),
      metricSignal((ctx) => ctx.metrics.lineCount, 2, w(3), "Multiple paragraphs")
    ]
  }
];

function buildContext(text: string | undefined | null): ClassificationContext {
  const original = text ?? "";
  const normalized = original.replace(/\r\n?/g, "\n");
  const lower = normalized.toLowerCase();
  const tokenMatches = lower.match(/\b[\p{L}\p{N}][\p{L}\p{N}\-']*\b/gu) ?? [];
  const tokens = tokenMatches;
  const lines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const numericTokens = tokens.filter((token) => /^\d+[\d.,-]*$/.test(token)).length;
  const currencyMatches = lower.match(/(?:\$|€|£|¥|rp|idr|usd|eur|sgd|aud|cad|idr)/g) ?? [];
  const invoiceNumbers = lower.match(/\b(?:invoice|inv\.?|bill)\s*(?:no\.?|number|#)?\s*[:#]?\s*[a-z0-9-]{3,}\b/g) ?? [];
  const emailMatches = lower.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g) ?? [];
  const urlMatches = lower.match(/(?:https?:\/\/|www\.)[\w./-]+/g) ?? [];

  const bulletCount = lines.filter((line) => /^[\-\*\u2022]/.test(line)).length;
  const uppercaseHeadingCount = lines.filter((line) => line.length > 4 && line === line.toUpperCase() && /[A-Z]/.test(line)).length;
  const greetingLines = lines.filter((line) => /^(dear|hi|hello|ciao|good (morning|afternoon|evening))/i.test(line)).length;
  const closingLines = lines.filter((line) => /(regards|sincerely|yours|cordially|warm regards|kind regards|thank you)/i.test(line)).length;
  const signatureLines = lines.slice(-4).filter((line) => /(regards|sincerely|yours|thank you|best)/i.test(line)).length;
  const subjectLines = lines.filter((line) => /^subject\s*:/i.test(line)).length;
  const headerLines = lines.filter((line) => /^(from|to|cc|bcc)\s*:/i.test(line)).length;
  const sectionKeywordLines = lines.filter((line) => /(summary|overview|analysis|results|methodology|conclusion|findings|insights)/i.test(line)).length;
  const legalClauseCount = (lower.match(/\b(?:hereby|herein|whereas|hereto|party|parties|liability|indemnify|governing law|force majeure|assignment)\b/g) ?? []).length;
  const legalAllCapsCount = lines.filter((line) => /\bSECTION\s+\d+\b/.test(line) || /WITNESSETH/.test(line)).length;
  const financialSummaryLines = lines.filter((line) => /(subtotal|total|balance due|amount due|tax|vat|wire transfer)/i.test(line)).length;
  const dateLines = lines.filter((line) => /\b(?:\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})\b/i.test(line)).length;
  const itemizedLines = lines.filter((line) => /(item|qty|quantity|unit price|description)/i.test(line)).length;
  const referenceNumbers = (lower.match(/\bref(?:erence)?\.?\s*[:#]?\s*[a-z0-9-]{4,}\b/g) ?? []).length;
  const conclusionLines = lines.filter((line) => /(conclusion|next steps|recommendations|action items)/i.test(line)).length;
  const attachments = (lower.match(/\battachment(s)?|attached\b/g) ?? []).length;

  const metrics: ContextMetrics = {
    tokenCount: tokens.length,
    numericTokenRatio: tokens.length === 0 ? 0 : numericTokens / tokens.length,
    currencyCount: currencyMatches.length,
    invoiceNumberCount: invoiceNumbers.length,
    emailCount: emailMatches.length,
    urlCount: urlMatches.length,
    bulletCount,
    uppercaseHeadingCount,
    greetingLines,
    closingLines,
    signatureLines,
    subjectLines,
    headerLines,
    sectionKeywordLines,
    legalClauseCount,
    legalAllCapsCount,
    financialSummaryLines,
    dateLines,
    itemizedLines,
    referenceNumbers,
    conclusionLines,
    lineCount: lines.length,
    charLength: normalized.length,
    attachments
  };

  return {
    original,
    normalized,
    lower,
    tokens,
    lines,
    metrics
  };
}

function roundWeight(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export class GoldenDocumentClassifier {
  classify(text: string): ClassificationResult {
    const ctx = buildContext(text);
    const scores = DOCUMENT_TYPES.reduce<ClassificationScores>((acc, type) => {
      acc[type] = 0;
      return acc;
    }, Object.create(null));

    const featuresByCategory: Record<DocumentType, ClassificationFeature[]> = {
      invoice: [],
      email: [],
      contract: [],
      report: [],
      letter: []
    };

    for (const config of CATEGORY_CONFIGS) {
      let score = config.bias;
      const matches: ClassificationFeature[] = [];

      config.signals.forEach((signal, index) => {
        const match = signal(ctx);
        if (match) {
          const weightBoost = 1 + index / (PHI * 8);
          const weighted = roundWeight(match.weight * weightBoost);
          score += weighted;
          matches.push({ category: config.id, description: match.description, weight: weighted });
        }
      });

      scores[config.id] = roundWeight(score);
      featuresByCategory[config.id] = matches.sort((a, b) => b.weight - a.weight);
    }

    const allFeatures = (Object.values(featuresByCategory) as ClassificationFeature[][])
      .flat()
      .sort((a, b) => b.weight - a.weight);

    const ranked = Object.entries(scores)
      .map(([type, score]) => ({ type: type as DocumentType, score }))
      .sort((a, b) => b.score - a.score);

    const hasSignals = allFeatures.length > 0;
    const best = ranked[0] ?? { type: "letter" as DocumentType, score: 0 };
    const second = ranked[1] ?? { score: 0, type: best.type };

    let predictedType: DocumentType = best.type;
    let confidence = 0;

    if (!hasSignals) {
      predictedType = "letter";
      confidence = 0;
    } else {
      confidence = best.score <= 0
        ? 0
        : Math.min(0.99, best.score / (best.score + second.score / PHI + 1 / PHI));
    }

    const matchedFeatures = hasSignals
      ? [...featuresByCategory[predictedType]].slice(0, 8)
      : [];

    return {
      type: predictedType,
      confidence: Math.round(confidence * 1000) / 1000,
      scores,
      ranked,
      features: allFeatures,
      matchedFeatures
    };
  }

  classifyBatch(texts: Array<string>): ClassificationResult[] {
    return texts.map((text) => this.classify(text));
  }
}

if (process.env.RUN_AS_CLI === "1") {
  (async () => {
    const fs = await import("node:fs/promises");
    const args = process.argv.slice(2);
    const jsonOutput = args.includes("--json");
    const pathArg = args.find((arg) => !arg.startsWith("--"));

    const input = pathArg
      ? await fs.readFile(pathArg, "utf8")
      : await readStdin();

    const classifier = new GoldenDocumentClassifier();
    const result = classifier.classify(input);

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`🔮 Golden Document Classifier (φ = ${PHI})`);
      console.log(`Type: ${result.type}`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log("Scores:");
      result.ranked.forEach((entry) => {
        console.log(`  • ${entry.type}: ${entry.score.toFixed(3)}`);
      });
      if (result.matchedFeatures.length) {
        console.log("Key signals:");
        result.matchedFeatures.forEach((feature) => {
          console.log(`  - ${feature.description} (weight ${feature.weight.toFixed(2)})`);
        });
      } else {
        console.log("No strong signals detected (confidence derived from baseline features).");
      }
    }
  })().catch((error) => {
    console.error("Classifier CLI error:", error);
    process.exitCode = 1;
  });
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export { PHI };
