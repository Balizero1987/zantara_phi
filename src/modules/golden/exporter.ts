import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { AnalysisResult } from './pipeline';

export type ExportFormat = 'json' | 'pdf';

export interface ExportOptions {
  directory: string;
  fileName?: string;
  formats: ExportFormat[];
  metadata?: Record<string, unknown>;
}

export async function exportAnalysis(
  result: AnalysisResult,
  options: ExportOptions
): Promise<{ files: string[] }> {
  const formats = Array.from(new Set(options.formats));
  if (formats.length === 0) {
    return { files: [] };
  }

  const directory = options.directory;
  const baseName = (options.fileName ?? defaultFileName()).replace(/\s+/g, '_');

  await fs.mkdir(directory, { recursive: true });
  const written: string[] = [];

  if (formats.includes('json')) {
    const jsonPath = join(directory, `${baseName}.json`);
    const payload = {
      exportedAt: new Date().toISOString(),
      metadata: options.metadata ?? {},
      result
    };
    await fs.writeFile(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
    written.push(jsonPath);
  }

  if (formats.includes('pdf')) {
    const pdfPath = join(directory, `${baseName}.pdf`);
    const pdfBuffer = createPdfReport(result, options.metadata);
    await fs.writeFile(pdfPath, pdfBuffer);
    written.push(pdfPath);
  }

  return { files: written };
}

function defaultFileName(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `analysis-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function createPdfReport(result: AnalysisResult, metadata: Record<string, unknown> = {}): Buffer {
  const lines: string[] = [];
  lines.push('ZANTARA PHI Analysis');
  lines.push(`Timestamp: ${new Date().toISOString()}`);
  if (metadata.source) {
    lines.push(`Source: ${metadata.source}`);
  }
  if (result.summary) {
    lines.push('');
    lines.push('Summary');
    lines.push(`- Golden Ratio Score: ${result.summary.goldenRatio}`);
    lines.push(`- Complexity: ${result.summary.complexity}`);
    lines.push(`- Confidence: ${result.summary.confidence}`);
    lines.push(`- Processing Time: ${result.summary.processingTime} ms`);
  }
  if (result.classification) {
    lines.push('');
    lines.push(`Classification: ${result.classification.type} (${Math.round(result.classification.confidence * 100)}%)`);
    lines.push('Top signals:');
    const top = result.classification.matchedFeatures.slice(0, 5);
    if (top.length === 0) {
      lines.push('- No strong signals');
    } else {
      top.forEach((feature) => {
        lines.push(`- ${feature.description} [${feature.weight.toFixed(2)}]`);
      });
    }
  }
  if (result.keywords && result.keywords.length > 0) {
    lines.push('');
    lines.push('Keywords (Top 5):');
    result.keywords.slice(0, 5).forEach((kw) => {
      lines.push(`- ${kw.keyword} (${kw.score})`);
    });
  }
  if (result.patterns && result.patterns.length > 0) {
    lines.push('');
    lines.push('Patterns (Top 3):');
    result.patterns.slice(0, 3).forEach((pattern) => {
      lines.push(`- ${pattern.pattern} [${pattern.score}]`);
    });
  }

  const pdfContent = buildPdfContent(lines);
  return Buffer.from(pdfContent, 'binary');
}

function buildPdfContent(lines: string[]): string {
  const escape = (text: string) => text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  const textLines = lines.length > 0 ? lines : ['No analysis available'];

  let contentStream = 'BT\n';
  contentStream += '/F1 12 Tf\n';
  contentStream += '14 TL\n';
  contentStream += '72 750 Td\n';
  contentStream += textLines
    .map((line, index) => {
      const prefix = index === 0 ? '' : 'T*\n';
      return `${prefix}(${escape(line)}) Tj\n`;
    })
    .join('');
  contentStream += 'ET\n';

  const objects: string[] = [];
  const offsets: number[] = [];

  const addObject = (obj: string) => {
    const prev = objects.join('');
    offsets.push(prev.length + header.length);
    objects.push(obj);
  };

  const header = '%PDF-1.4\n';
  addObject('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  addObject('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  addObject('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n');
  addObject(`4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`);
  addObject('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  const body = objects.join('');

  const xrefOffset = header.length + body.length;
  const xrefEntries = ['0000000000 65535 f \n'];
  offsets.forEach((offset) => {
    xrefEntries.push(`${offset.toString().padStart(10, '0')} 00000 n \n`);
  });
  const xref = `xref\n0 ${xrefEntries.length}\n${xrefEntries.join('')}trailer\n<< /Size ${xrefEntries.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return header + body + xref;
}

export { createPdfReport };
