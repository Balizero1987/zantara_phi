#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import { watch } from 'node:fs';
import { join, resolve, extname, basename } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { GoldenPipeline } from '../modules/golden/pipeline';
import { ExportFormat } from '../modules/golden/exporter';

const DEFAULT_INPUT = resolve(process.cwd(), process.env.WATCH_INPUT_DIR ?? 'incoming');
const DEFAULT_OUTPUT = resolve(process.cwd(), process.env.WATCH_OUTPUT_DIR ?? 'exports');
const DEFAULT_FORMATS = parseFormats(process.env.WATCH_FORMATS ?? 'json,pdf');
const ALLOWED_EXT = new Set(['.txt', '.md']);

async function main() {
  const inputDir = DEFAULT_INPUT;
  const outputDir = DEFAULT_OUTPUT;
  const formats = DEFAULT_FORMATS;

  await fs.mkdir(inputDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });

  const pipeline = new GoldenPipeline({
    includeClassifier: true,
    exportFormats: formats,
    exportDirectory: outputDir
  });

  const processed = new Set<string>();

  console.log(`👁️  Watching directory: ${inputDir}`);
  console.log(`📤 Exports directory: ${outputDir}`);
  console.log(`🧾 Formats: ${formats.join(', ')}`);

  const queue = new Map<string, NodeJS.Timeout>();

  const scheduleProcess = (filePath: string) => {
    if (processed.has(filePath)) return;
    const extension = extname(filePath).toLowerCase();
    if (!ALLOWED_EXT.has(extension)) return;

    if (queue.has(filePath)) {
      clearTimeout(queue.get(filePath)!);
    }
    const handle = setTimeout(() => {
      queue.delete(filePath);
      processFile(filePath).catch((err) => {
        console.error('❌ Unable to process file:', filePath, err);
      });
    }, 200);
    queue.set(filePath, handle);
  };

  const processFile = async (filePath: string) => {
    try {
      for (let i = 0; i < 6; i++) {
        try {
          const stat = await fs.stat(filePath);
          if (stat.isFile() && stat.size > 0) {
            break;
          }
        } catch (err) {
          if (i === 5) throw err;
        }
        await delay(100);
      }

      const data = await fs.readFile(filePath, 'utf8');
      if (!data.trim()) {
        console.warn(`⚠️  Skipping empty file: ${filePath}`);
        processed.add(filePath);
        return;
      }

      const base = basename(filePath, extname(filePath));
      const analysis = await pipeline.analyze(data, {
        export: {
          directory: outputDir,
          fileName: base,
          formats,
          metadata: {
            source: filePath
          }
        }
      });

      processed.add(filePath);

      const files = analysis.exports?.files ?? [];
      if (files.length > 0) {
        console.log(`✅ Processed ${basename(filePath)} → ${files.join(', ')}`);
      } else {
        console.log(`ℹ️  Processed ${basename(filePath)} (no export formats configured)`);
      }
    } catch (error) {
      console.error('❌ Error processing file:', filePath, error);
    }
  };

  const existing = await fs.readdir(inputDir);
  for (const file of existing) {
    scheduleProcess(join(inputDir, file));
  }

  watch(inputDir, { persistent: true }, (_eventType, filename) => {
    if (!filename) return;
    scheduleProcess(join(inputDir, filename));
  });
}

function parseFormats(raw: string): ExportFormat[] {
  return raw
    .split(',')
    .map((fragment) => fragment.trim().toLowerCase())
    .filter((fragment): fragment is ExportFormat => fragment === 'json' || fragment === 'pdf');
}

main().catch((error) => {
  console.error('🚨 Watcher crashed:', error);
  process.exit(1);
});
