import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const contentRoot = path.join(repoRoot, 'src', 'content');
const generatedRoot = path.join(repoRoot, 'fonts', 'generated');
const publicRoot = path.join(repoRoot, 'public', 'fonts');
const venvRoot = path.join(repoRoot, 'fonts', '.venv');

const printableAscii = Array.from({ length: 95 }, (_, index) => String.fromCharCode(index + 32)).join('');
const latinSeed = `${printableAscii}’‘“”–—…⸺•·一二三四五六七八九十`;
const bodyRegularLayoutFeatures = 'ccmp,kern,liga,onum,calt,dlig,cv02,hlig,locl,mark,mkmk,smcp,c2sc,sups';
const bodyItalicLayoutFeatures = 'ccmp,clig,kern,liga,onum,calt,dlig,cv02,hlig,locl,mark,mkmk,smcp,c2sc,sups,swsh';
const bodySemiboldLayoutFeatures = 'kern,liga,onum,dlig,locl,smcp,swsh';
const monoLayoutFeatures = '*';
const cjkLayoutFeatures = 'vrt2,ccmp,locl,vert,vkrn,kern,liga,jp78,jp83,jp90,nlck,palt';

const bodyFontPaths = {
  regular: path.join(repoRoot, 'fonts', 'source', 'eb-garamond', 'EBGaramond-Regular.ttf'),
  italic: path.join(repoRoot, 'fonts', 'source', 'eb-garamond', 'EBGaramond-Italic.ttf'),
  semibold: path.join(repoRoot, 'fonts', 'source', 'eb-garamond', 'EBGaramond-SemiBold.ttf'),
};

const monoFontPaths = {
  regular: path.join(repoRoot, 'fonts', 'source', 'ia-duo', 'iAWriterDuo-Regular.ttf'),
  italic: path.join(repoRoot, 'fonts', 'source', 'ia-duo', 'iAWriterDuo-Italic.ttf'),
};

type EntryLang = 'en' | 'zh' | 'ja';
type CharsetName = 'latin' | 'zh' | 'ja';

type FontInspection = {
  axes: string[];
  family: string;
  features: string[];
  flavor: string;
  path: string;
  subfamily: string;
};

type FontJob = {
  charset: CharsetName;
  extraArgs?: string[];
  features: string;
  id: string;
  inputPath: string;
  kind: 'body' | 'mono' | 'cjk';
  outputPath: string;
};

type FontReport = {
  availableFeatures: string[];
  axes: string[];
  charset: CharsetName;
  charsetCount: number;
  extraArgs: string[];
  family: string;
  featuresSpec: string;
  flavor: string;
  id: string;
  inputPath: string;
  keptFeatures: string[];
  kind: FontJob['kind'];
  outputBytes: number;
  outputPath: string;
  requestedButMissing: string[];
  subfamily: string;
  droppedFeatures: string[];
};

const fontJobs: FontJob[] = [
  {
    id: 'body-regular',
    kind: 'body',
    charset: 'latin',
    inputPath: bodyFontPaths.regular,
    outputPath: path.join(publicRoot, 'eb-garamond', 'eb-garamond-regular.woff2'),
    features: bodyRegularLayoutFeatures,
  },
  {
    id: 'body-italic',
    kind: 'body',
    charset: 'latin',
    inputPath: bodyFontPaths.italic,
    outputPath: path.join(publicRoot, 'eb-garamond', 'eb-garamond-italic.woff2'),
    features: bodyItalicLayoutFeatures,
  },
  {
    id: 'body-semibold',
    kind: 'body',
    charset: 'latin',
    inputPath: bodyFontPaths.semibold,
    outputPath: path.join(publicRoot, 'eb-garamond', 'eb-garamond-semibold.woff2'),
    features: bodySemiboldLayoutFeatures,
  },
  {
    id: 'mono-regular',
    kind: 'mono',
    charset: 'latin',
    inputPath: monoFontPaths.regular,
    outputPath: path.join(publicRoot, 'ia-duo', 'ia-writer-duo-regular.woff2'),
    features: monoLayoutFeatures,
  },
  {
    id: 'mono-italic',
    kind: 'mono',
    charset: 'latin',
    inputPath: monoFontPaths.italic,
    outputPath: path.join(publicRoot, 'ia-duo', 'ia-writer-duo-italic.woff2'),
    features: monoLayoutFeatures,
  },
  {
    id: 'cjk-zh',
    kind: 'cjk',
    charset: 'zh',
    inputPath: path.join(repoRoot, 'fonts', 'source', 'source-han-serif-cn', 'SourceHanSerifCN-Regular.otf'),
    outputPath: path.join(publicRoot, 'SourceHanSerifCN', 'source-han-serif-cn-regular.woff2'),
    features: cjkLayoutFeatures,
    extraArgs: ['--desubroutinize'],
  },
  {
    id: 'cjk-ja',
    kind: 'cjk',
    charset: 'ja',
    inputPath: path.join(repoRoot, 'fonts', 'source', 'source-han-serif-jp', 'SourceHanSerifJP-Regular.otf'),
    outputPath: path.join(publicRoot, 'SourceHanSerifJP', 'source-han-serif-jp-regular.woff2'),
    features: cjkLayoutFeatures,
    extraArgs: ['--desubroutinize'],
  },
];

function listMarkdownFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

function stripQuotes(value: string): string {
  return value.replace(/^['"]|['"]$/g, '');
}

function parseFrontmatter(text: string): { data: Record<string, string>; body: string } {
  if (!text.startsWith('---\n')) {
    return { data: {}, body: text };
  }

  const end = text.indexOf('\n---\n', 4);
  if (end === -1) {
    return { data: {}, body: text };
  }

  const rawFrontmatter = text.slice(4, end);
  const body = text.slice(end + 5);
  const data: Record<string, string> = {};

  for (const line of rawFrontmatter.split('\n')) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.+)$/);
    if (!match) {
      continue;
    }

    data[match[1]] = stripQuotes(match[2].trim());
  }

  return { data, body };
}

function inferLang(filePath: string, explicit?: string): EntryLang {
  if (explicit === 'zh' || explicit === 'ja' || explicit === 'en') {
    return explicit;
  }

  if (filePath.endsWith('-zh.md')) {
    return 'zh';
  }

  if (filePath.endsWith('-ja.md')) {
    return 'ja';
  }

  return 'en';
}

function uniqueChars(text: string): string {
  return Array.from(new Set([...text])).sort((left, right) => left.codePointAt(0)! - right.codePointAt(0)!).join('');
}

function ensureDir(dirPath: string): void {
  mkdirSync(dirPath, { recursive: true });
}

function run(command: string, args: string[]): void {
  execFileSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}

function runCapture(command: string, args: string[]): string {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
}

function venvBin(name: string): string {
  return path.join(venvRoot, 'bin', name);
}

function ensureFonttools(): string {
  const pyftsubset = venvBin('pyftsubset');
  if (existsSync(pyftsubset)) {
    return pyftsubset;
  }

  run('python3', ['-m', 'venv', venvRoot]);
  run(venvBin('pip'), ['install', 'fonttools', 'brotli', 'zopfli']);

  return pyftsubset;
}

function inspectFont(fontPath: string): FontInspection {
  const pythonCode = `
import json
import sys
from fontTools.ttLib import TTFont

font = TTFont(sys.argv[1])

def pick_name(name_id):
    for record in font["name"].names:
        if record.nameID == name_id:
            try:
                return record.toUnicode()
            except Exception:
                continue
    return ""

features = []
for table_name in ("GSUB", "GPOS"):
    if table_name in font and getattr(font[table_name].table, "FeatureList", None):
        features.extend(record.FeatureTag for record in font[table_name].table.FeatureList.FeatureRecord)

axes = [axis.axisTag for axis in font["fvar"].axes] if "fvar" in font else []

print(json.dumps({
    "path": sys.argv[1],
    "family": pick_name(16) or pick_name(1),
    "subfamily": pick_name(17) or pick_name(2),
    "flavor": "CFF" if "CFF " in font else "glyf",
    "axes": sorted(axes),
    "features": sorted(set(features)),
}))
`;

  return JSON.parse(runCapture(venvBin('python'), ['-c', pythonCode, fontPath])) as FontInspection;
}

function collectGlyphs(): Record<EntryLang | 'latin', string> {
  const files = listMarkdownFiles(contentRoot);
  let allText = latinSeed;
  let zhText = latinSeed;
  let jaText = latinSeed;

  for (const filePath of files) {
    const raw = readFileSync(filePath, 'utf8');
    const { data, body } = parseFrontmatter(raw);
    const frontmatterText = [data.title, data.description, data.headnote].filter(Boolean).join('');
    const text = `${frontmatterText}${body}`;
    const lang = inferLang(filePath, data.lang);

    allText += text;

    if (lang === 'zh') {
      zhText += text;
    }

    if (lang === 'ja') {
      jaText += text;
    }
  }

  return {
    latin: uniqueChars(allText),
    zh: uniqueChars(zhText),
    ja: uniqueChars(jaText),
    en: uniqueChars(allText),
  };
}

function writeCharset(name: string, text: string): string {
  ensureDir(generatedRoot);
  const outputPath = path.join(generatedRoot, `${name}.txt`);
  writeFileSync(outputPath, text);
  return outputPath;
}

function parseFeatureSpec(spec: string): string[] {
  return spec === '*' ? [] : spec.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function resolveKeptFeatures(spec: string, availableFeatures: string[]): { kept: string[]; missing: string[] } {
  if (spec === '*') {
    return {
      kept: [...availableFeatures],
      missing: [],
    };
  }

  const requested = parseFeatureSpec(spec);
  const kept = requested.filter((feature) => availableFeatures.includes(feature));
  const missing = requested.filter((feature) => !availableFeatures.includes(feature));

  return { kept, missing };
}

function formatCodepoints(text: string): string {
  return [...text]
    .map((char) => `U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`)
    .join(', ');
}

function isVisibleChar(char: string): boolean {
  return !/[\u0000-\u001F\u007F]/u.test(char);
}

function writeGeneratedReport(relativePath: string, content: string): void {
  const outputPath = path.join(generatedRoot, relativePath);
  ensureDir(path.dirname(outputPath));
  writeFileSync(outputPath, content);
}

function writeCharsetReports(charsets: Record<CharsetName, string>): void {
  const lines = ['# Charset Report', ''];

  for (const [name, text] of Object.entries(charsets) as Array<[CharsetName, string]>) {
    const preview = [...text].filter(isVisibleChar).slice(0, 24).join('');
    const previewCodepoints = formatCodepoints([...text].slice(0, 12).join(''));

    lines.push(`## ${name}`);
    lines.push('');
    lines.push(`- Characters: ${[...text].length}`);
    lines.push(`- File: \`${name}.txt\``);
    lines.push(`- Preview: \`${preview}\``);
    lines.push(`- First codepoints: ${previewCodepoints || '(none)'}`);
    lines.push('');
  }

  writeGeneratedReport('charsets.md', `${lines.join('\n')}\n`);
}

function writeFontReports(reports: FontReport[]): void {
  const markdownLines = ['# Font Feature Report', ''];

  for (const report of reports) {
    markdownLines.push(`## ${report.id}`);
    markdownLines.push('');
    markdownLines.push(`- Source: \`${path.relative(repoRoot, report.inputPath)}\``);
    markdownLines.push(`- Output: \`${path.relative(repoRoot, report.outputPath)}\``);
    markdownLines.push(`- Family: \`${report.family}\``);
    markdownLines.push(`- Subfamily: \`${report.subfamily}\``);
    markdownLines.push(`- Flavor: \`${report.flavor}\``);
    markdownLines.push(`- Axes: ${report.axes.length ? report.axes.map((axis) => `\`${axis}\``).join(', ') : '(none)'}`);
    markdownLines.push(`- Charset: \`${report.charset}\` (${report.charsetCount} chars)`);
    markdownLines.push(`- Output size: ${report.outputBytes} bytes`);
    markdownLines.push(`- Feature spec: \`${report.featuresSpec}\``);
    markdownLines.push(`- Available features: ${report.availableFeatures.length ? report.availableFeatures.map((feature) => `\`${feature}\``).join(', ') : '(none)'}`);
    markdownLines.push(`- Kept features: ${report.keptFeatures.length ? report.keptFeatures.map((feature) => `\`${feature}\``).join(', ') : '(none)'}`);
    markdownLines.push(`- Dropped features: ${report.droppedFeatures.length ? report.droppedFeatures.map((feature) => `\`${feature}\``).join(', ') : '(none)'}`);
    markdownLines.push(`- Requested but missing: ${report.requestedButMissing.length ? report.requestedButMissing.map((feature) => `\`${feature}\``).join(', ') : '(none)'}`);
    if (report.extraArgs.length > 0) {
      markdownLines.push(`- Extra subset args: ${report.extraArgs.map((arg) => `\`${arg}\``).join(', ')}`);
    }
    markdownLines.push('');
  }

  writeGeneratedReport('font-features.md', `${markdownLines.join('\n')}\n`);
  writeGeneratedReport('font-report.json', `${JSON.stringify(reports, null, 2)}\n`);
}

function subsetFont(
  pyftsubset: string,
  inputPath: string,
  outputPath: string,
  textFilePath: string,
  layoutFeatures: string,
  extraArgs: string[] = [],
): void {
  ensureDir(path.dirname(outputPath));
  run(pyftsubset, [
    inputPath,
    `--output-file=${outputPath}`,
    '--flavor=woff2',
    `--text-file=${textFilePath}`,
    `--layout-features=${layoutFeatures}`,
    '--ignore-missing-unicodes',
    '--no-hinting',
    ...extraArgs,
  ]);
}

function cleanPublicFonts(): void {
  rmSync(path.join(publicRoot, 'eb-garamond'), { recursive: true, force: true });
  rmSync(path.join(publicRoot, 'ia-duo'), { recursive: true, force: true });
  rmSync(path.join(publicRoot, 'SourceHanSerifCN'), { recursive: true, force: true });
  rmSync(path.join(publicRoot, 'SourceHanSerifJP'), { recursive: true, force: true });
}

function main(): void {
  const pyftsubset = ensureFonttools();
  const glyphs = collectGlyphs();
  const charsets: Record<CharsetName, string> = {
    latin: glyphs.latin,
    zh: glyphs.zh,
    ja: glyphs.ja,
  };
  const charsetPaths: Record<CharsetName, string> = {
    latin: writeCharset('latin', charsets.latin),
    zh: writeCharset('zh', charsets.zh),
    ja: writeCharset('ja', charsets.ja),
  };

  cleanPublicFonts();

  const reports: FontReport[] = [];

  for (const job of fontJobs) {
    subsetFont(
      pyftsubset,
      job.inputPath,
      job.outputPath,
      charsetPaths[job.charset],
      job.features,
      job.extraArgs ?? [],
    );

    const inspection = inspectFont(job.inputPath);
    const { kept, missing } = resolveKeptFeatures(job.features, inspection.features);

    reports.push({
      id: job.id,
      kind: job.kind,
      charset: job.charset,
      charsetCount: [...charsets[job.charset]].length,
      inputPath: job.inputPath,
      outputPath: job.outputPath,
      family: inspection.family,
      subfamily: inspection.subfamily,
      flavor: inspection.flavor,
      axes: inspection.axes,
      availableFeatures: inspection.features,
      featuresSpec: job.features,
      keptFeatures: kept,
      droppedFeatures: inspection.features.filter((feature) => !kept.includes(feature)),
      requestedButMissing: missing,
      extraArgs: job.extraArgs ?? [],
      outputBytes: statSync(job.outputPath).size,
    });
  }

  writeCharsetReports(charsets);
  writeFontReports(reports);
}

main();
