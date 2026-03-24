import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkSmartypants from 'remark-smartypants';
import { unified } from 'unified';

import { ENTRY_LANGS, SITE_TITLE } from '../src/consts.ts';
import { formatReadableDate } from '../src/lib/date.ts';
import rehypeAttributeLists from '../src/lib/rehype-attribute-lists.ts';
import rehypeFigureImages from '../src/lib/rehype-figure-images.ts';
import rehypeMarkEndElement from '../src/lib/rehype-mark-end-element.ts';
import rehypePrefixFootnoteIds from '../src/lib/rehype-prefix-footnote-ids.ts';
import rehypeQuoteDirectives from '../src/lib/rehype-quote-directives.ts';
import rehypeTypography from '../src/lib/rehype-typography.ts';
import remarkAttributeLists from '../src/lib/remark-attribute-lists.ts';
import remarkDirectives from '../src/lib/remark-directives.ts';
import remarkTypography from '../src/lib/remark-typography.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const contentRoot = path.join(repoRoot, 'src', 'content');
const generatedRoot = path.join(repoRoot, 'fonts', 'generated');
const generatedFontRoot = path.join(repoRoot, 'src', 'fonts');
const legacyPublicRoot = path.join(repoRoot, 'public', 'fonts');
const venvRoot = path.join(repoRoot, 'fonts', '.venv');
const configPath = path.join(repoRoot, 'fonts', 'fonts.config.json');

const markdownFragmentProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkSmartypants)
  .use(remarkDirective)
  .use(remarkDirectives)
  .use(remarkAttributeLists)
  .use(remarkTypography)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypePrefixFootnoteIds)
  .use(rehypeQuoteDirectives)
  .use(rehypeAttributeLists)
  .use(rehypeTypography)
  .use(rehypeFigureImages)
  .use(rehypeMarkEndElement)
  .use(rehypeStringify, { allowDangerousHtml: true })
  .freeze();

type EntryLang = 'en' | 'zh' | 'ja';

type FontInspection = {
  axes: string[];
  family: string;
  features: string[];
  flavor: string;
  path: string;
  requiredFeatures: string[];
  subfamily: string;
};

type RenderedFieldName = 'description' | 'headnote' | 'body';

type CharsetSourceConfig = {
  allRawText?: boolean;
  alwaysIncludeChars?: string;
  extraText?: string[];
  lang?: EntryLang;
  langRawText?: EntryLang;
  selectors?: string[];
};

type FontJob = {
  charsetSource: CharsetSourceConfig;
  excludeFeatures?: string[];
  extraArgs?: string[];
  features: string[];
  id: string;
  inputPath: string;
  kind: 'body' | 'mono' | 'cjk';
  outputPath: string;
};

type FontJobConfigFile = {
  jobs: FontJob[];
};

type FontReport = {
  autoKeptRequiredFeatures: string[];
  droppedFeatures: string[];
  excludedFeatures: string[];
  includedCount: number;
  id: string;
  keptFeatures: string[];
  outputBytes: number;
  outputPath: string;
  requestedCount: number;
  requestedButMissing: string[];
};

type ContentEntryRecord = {
  body: string;
  collection: string;
  date?: Date;
  description: string;
  filePath: string;
  headnote: string;
  lang: EntryLang;
  relativePath: string;
  rendered: Record<RenderedFieldName, string>;
  title: string;
};

type SelectorDocument = {
  html: string;
  lang?: EntryLang;
};

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

function ensureEntryLang(value: unknown, context: string): EntryLang {
  if (value === 'en' || value === 'zh' || value === 'ja') {
    return value;
  }

  throw new Error(`${context} must be one of "en", "zh", or "ja".`);
}

function ensureStringArray(value: unknown, context: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${context} must be an array of strings.`);
  }

  return value;
}

function parseCharsetSourceConfig(value: unknown, context: string): CharsetSourceConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${context} must be an object.`);
  }

  const source = value as Record<string, unknown>;

  return {
    allRawText: typeof source.allRawText === 'boolean' ? source.allRawText : undefined,
    alwaysIncludeChars: typeof source.alwaysIncludeChars === 'string' ? source.alwaysIncludeChars : undefined,
    extraText: source.extraText === undefined ? undefined : ensureStringArray(source.extraText, `${context}.extraText`),
    lang: source.lang === undefined ? undefined : ensureEntryLang(source.lang, `${context}.lang`),
    langRawText: source.langRawText === undefined ? undefined : ensureEntryLang(source.langRawText, `${context}.langRawText`),
    selectors: source.selectors === undefined ? undefined : ensureStringArray(source.selectors, `${context}.selectors`),
  };
}

function loadFontJobs(): FontJob[] {
  const raw = JSON.parse(readFileSync(configPath, 'utf8')) as unknown;

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('fonts/fonts.config.json must be an object.');
  }

  const config = raw as Partial<FontJobConfigFile> & Record<string, unknown>;
  if (!Array.isArray(config.jobs)) {
    throw new Error('fonts/fonts.config.json must contain a jobs array.');
  }

  return config.jobs.map((job, index) => {
    if (!job || typeof job !== 'object' || Array.isArray(job)) {
      throw new Error(`jobs[${index}] must be an object.`);
    }

    const rawJob = job as Record<string, unknown>;
    if (rawJob.kind !== 'body' && rawJob.kind !== 'mono' && rawJob.kind !== 'cjk') {
      throw new Error(`jobs[${index}].kind must be "body", "mono", or "cjk".`);
    }

    if (typeof rawJob.id !== 'string' || rawJob.id.length === 0) {
      throw new Error(`jobs[${index}].id must be a non-empty string.`);
    }

    if (typeof rawJob.inputPath !== 'string' || rawJob.inputPath.length === 0) {
      throw new Error(`jobs[${index}].inputPath must be a non-empty string.`);
    }

    if (typeof rawJob.outputPath !== 'string' || rawJob.outputPath.length === 0) {
      throw new Error(`jobs[${index}].outputPath must be a non-empty string.`);
    }

    if (!Array.isArray(rawJob.features) || rawJob.features.some((item) => typeof item !== 'string')) {
      throw new Error(`jobs[${index}].features must be an array of strings.`);
    }

    if (rawJob.features.includes('*')) {
      throw new Error(`jobs[${index}].features cannot include "*"; list features explicitly.`);
    }

    return {
      id: rawJob.id,
      kind: rawJob.kind,
      inputPath: path.join(repoRoot, rawJob.inputPath),
      outputPath: path.join(repoRoot, rawJob.outputPath),
      features: rawJob.features,
      excludeFeatures: rawJob.excludeFeatures === undefined ? undefined : ensureStringArray(rawJob.excludeFeatures, `jobs[${index}].excludeFeatures`),
      extraArgs: rawJob.extraArgs === undefined ? undefined : ensureStringArray(rawJob.extraArgs, `jobs[${index}].extraArgs`),
      charsetSource: parseCharsetSourceConfig(rawJob.charsetSource, `jobs[${index}].charsetSource`),
    };
  });
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
required_features = set()
for table_name in ("GSUB", "GPOS"):
    if table_name not in font:
        continue

    table = font[table_name].table
    feature_list = getattr(table, "FeatureList", None)
    if feature_list:
        feature_records = feature_list.FeatureRecord
        features.extend(record.FeatureTag for record in feature_records)

        script_list = getattr(table, "ScriptList", None)
        if script_list:
            for script_record in script_list.ScriptRecord:
                script = script_record.Script
                langsys_tables = []
                if getattr(script, "DefaultLangSys", None) is not None:
                    langsys_tables.append(script.DefaultLangSys)
                for langsys_record in getattr(script, "LangSysRecord", []) or []:
                    langsys_tables.append(langsys_record.LangSys)

                for langsys in langsys_tables:
                    required_index = getattr(langsys, "ReqFeatureIndex", 0xFFFF)
                    if required_index != 0xFFFF and required_index < len(feature_records):
                        required_features.add(feature_records[required_index].FeatureTag)

axes = [axis.axisTag for axis in font["fvar"].axes] if "fvar" in font else []

print(json.dumps({
    "path": sys.argv[1],
    "family": pick_name(16) or pick_name(1),
    "subfamily": pick_name(17) or pick_name(2),
    "flavor": "CFF" if "CFF " in font else "glyf",
    "axes": sorted(axes),
    "features": sorted(set(features)),
    "requiredFeatures": sorted(required_features),
}))
`;

  return JSON.parse(runCapture(venvBin('python'), ['-c', pythonCode, fontPath])) as FontInspection;
}

function parseDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function renderMarkdownFragment(markdown: string, filePath: string): Promise<string> {
  return String(
    await markdownFragmentProcessor.process({
      path: filePath,
      value: markdown,
    }),
  );
}

async function loadContentEntries(): Promise<ContentEntryRecord[]> {
  const files = listMarkdownFiles(contentRoot);
  const entries: ContentEntryRecord[] = [];

  for (const filePath of files) {
    const raw = readFileSync(filePath, 'utf8');
    const { data, body } = parseFrontmatter(raw);
    const relativePath = path.relative(repoRoot, filePath);
    const title = data.title ?? '';
    const description = data.description ?? '';
    const headnote = data.headnote ?? '';

    entries.push({
      filePath,
      relativePath,
      collection: relativePath.split(path.sep)[1] ?? '',
      lang: inferLang(filePath, data.lang),
      title,
      description,
      headnote,
      body,
      date: parseDate(data.date),
      rendered: {
        description: description ? await renderMarkdownFragment(description, `${relativePath}#description`) : '',
        headnote: headnote ? await renderMarkdownFragment(headnote, `${relativePath}#headnote`) : '',
        body: body ? await renderMarkdownFragment(body, relativePath) : '',
      },
    });
  }

  return entries;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function collectRawEntryText(entries: ContentEntryRecord[], lang?: EntryLang): string {
  return entries
    .filter((entry) => !lang || entry.lang === lang)
    .map((entry) => `${entry.title}${entry.description}${entry.headnote}${entry.body}`)
    .join('');
}

function buildSelectorDocuments(entries: ContentEntryRecord[]): SelectorDocument[] {
  const documents: SelectorDocument[] = [
    {
      lang: 'en',
      html: `<div data-font-root><h1 class="site-title">${escapeHtml(SITE_TITLE)}</h1></div>`,
    },
  ];

  const seriesTitles = new Set<string>();

  for (const entry of entries) {
    if (entry.collection === 'posts') {
      const segments = entry.relativePath.split(path.sep);
      const seriesSegment = segments[2];
      if (seriesSegment) {
        seriesTitles.add(seriesSegment.replace(/^\d+-/, ''));
      }

      documents.push({
        lang: entry.lang,
        html: [
          '<div data-font-root>',
          `<h1>${escapeHtml(entry.title)}</h1>`,
          entry.date ? `<time>${escapeHtml(formatReadableDate(entry.date))}</time>` : '',
          '<div class="language-switcher">',
          ENTRY_LANGS.map((lang) => `<span class="language-label">${lang.toUpperCase()}</span>`).join(''),
          '</div>',
          entry.rendered.description ? `<div class="description">${entry.rendered.description}</div>` : '',
          `<p class="podcast-player-title">${escapeHtml(entry.title)}</p>`,
          '</div>',
        ].join(''),
      });
    }

    if (entry.collection === 'interludes') {
      documents.push({
        lang: entry.lang,
        html: [
          '<div data-font-root>',
          entry.date ? `<time>${escapeHtml(formatReadableDate(entry.date))}</time>` : '',
          '<div class="language-switcher">',
          ENTRY_LANGS.map((lang) => `<span class="language-label">${lang.toUpperCase()}</span>`).join(''),
          '</div>',
          entry.rendered.headnote ? `<aside class="interlude-headnote">${entry.rendered.headnote}</aside>` : '',
          '</div>',
        ].join(''),
      });
    }

    documents.push({
      lang: entry.lang,
      html: `<div data-font-root>${entry.rendered.description}</div>`,
    });
    documents.push({
      lang: entry.lang,
      html: `<div data-font-root>${entry.rendered.headnote}</div>`,
    });
    documents.push({
      lang: entry.lang,
      html: `<div data-font-root>${entry.rendered.body}</div>`,
    });
  }

  documents.push({
    lang: 'en',
    html: `<div data-font-root>${[...seriesTitles].map((title) => `<h2>${escapeHtml(title)}</h2>`).join('')}</div>`,
  });

  return documents;
}

function extractSelectedRenderedText(html: string, selectors: string[]): string {
  if (!html || selectors.length === 0) {
    return '';
  }

  const root = parse(`<div>${html}</div>`);
  const texts: string[] = [];

  for (const selector of selectors) {
    for (const node of root.querySelectorAll(selector)) {
      texts.push(node.innerText);
    }
  }

  return texts.join('');
}

function collectCharsetText(entries: ContentEntryRecord[], selectorDocuments: SelectorDocument[], source: CharsetSourceConfig): string {
  let text = source.alwaysIncludeChars ?? '';

  if (source.allRawText) {
    text += collectRawEntryText(entries, source.lang);
  }

  if (source.langRawText) {
    text += collectRawEntryText(entries, source.langRawText);
  }

  if (source.selectors && source.selectors.length > 0) {
    for (const document of selectorDocuments) {
      if (source.lang && document.lang && document.lang !== source.lang) {
        continue;
      }

      if (source.lang && !document.lang) {
        continue;
      }

      text += extractSelectedRenderedText(document.html, source.selectors);
    }
  }

  if (source.extraText) {
    text += source.extraText.join('');
  }

  return uniqueChars(text);
}

function writeCharsetInput(root: string, name: string, text: string): string {
  ensureDir(root);
  const outputPath = path.join(root, `${name}.txt`);
  writeFileSync(outputPath, text);
  return outputPath;
}

function formatCharForInspector(char: string): string {
  if (char === '\n') {
    return '\\n';
  }

  if (char === '\t') {
    return '\\t';
  }

  if (char === ' ') {
    return 'SPACE';
  }

  return char;
}

function writeFontSnapshot(report: FontReport, text: string): string {
  ensureDir(generatedRoot);
  const outputPath = path.join(generatedRoot, `${report.id}.txt`);
  const header = [
    `# output: ${path.relative(repoRoot, report.outputPath)}`,
    `# output_bytes: ${report.outputBytes}`,
    `# requested_chars: ${report.requestedCount}`,
    `# included_chars: ${report.includedCount}`,
    `# auto_kept_required_features: ${report.autoKeptRequiredFeatures.join(', ') || '(none)'}`,
    `# kept_features: ${report.keptFeatures.join(', ') || '(none)'}`,
    `# excluded_features: ${report.excludedFeatures.join(', ') || '(none)'}`,
    `# dropped_features: ${report.droppedFeatures.join(', ') || '(none)'}`,
    `# requested_missing_features: ${report.requestedButMissing.join(', ') || '(none)'}`,
    '',
  ];
  const lines = [...text].map((char) => {
    const codepoint = `U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`;
    return `${codepoint}\t${formatCharForInspector(char)}`;
  });
  writeFileSync(outputPath, `${header.join('\n')}${lines.join('\n')}\n`);
  return outputPath;
}

function inspectSubsetText(fontPath: string): string {
  const pythonCode = `
import json
import sys
from fontTools.ttLib import TTFont

font = TTFont(sys.argv[1])
codepoints = set()
for table in font["cmap"].tables:
    codepoints.update(table.cmap.keys())

print(json.dumps(sorted(codepoints)))
`;

  const codepoints = JSON.parse(runCapture(venvBin('python'), ['-c', pythonCode, fontPath])) as number[];
  return codepoints.map((codepoint) => String.fromCodePoint(codepoint)).join('');
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function buildLayoutFeatureSpec(
  spec: string[],
  availableFeatures: string[],
  requiredFeatures: string[],
  excludedFeatures: string[],
): string {
  const exclusions = new Set(excludedFeatures);
  const available = new Set(availableFeatures);

  return uniqueStrings([...spec, ...requiredFeatures])
    .filter((feature) => available.has(feature) && !exclusions.has(feature))
    .join(',');
}

function resolveFeatureReport(
  spec: string[],
  availableFeatures: string[],
  requiredFeatures: string[],
  excludedFeatures: string[],
): { autoKeptRequired: string[]; dropped: string[]; excluded: string[]; kept: string[]; missing: string[] } {
  const excluded = uniqueStrings(excludedFeatures);
  const autoKeptRequired = requiredFeatures.filter((feature) => !excluded.includes(feature));
  const reportableFeatures = availableFeatures.filter((feature) => !autoKeptRequired.includes(feature));
  const excludedAvailable = reportableFeatures.filter((feature) => excluded.includes(feature));

  if (spec.length === 0) {
    return {
      autoKeptRequired,
      dropped: reportableFeatures.filter((feature) => !excluded.includes(feature)),
      excluded: excludedAvailable,
      kept: [],
      missing: [],
    };
  }

  const requested = uniqueStrings(spec.filter((feature) => !autoKeptRequired.includes(feature)));
  const kept = requested.filter((feature) => reportableFeatures.includes(feature) && !excluded.includes(feature));
  const missing = requested.filter((feature) => !reportableFeatures.includes(feature));
  const dropped = reportableFeatures.filter((feature) => !requested.includes(feature) && !excluded.includes(feature));

  return {
    autoKeptRequired,
    dropped,
    excluded: excludedAvailable,
    kept,
    missing,
  };
}

function subsetFont(
  pyftsubset: string,
  inputPath: string,
  outputPath: string,
  textFilePath: string,
  layoutFeatures: string,
  extraArgs: string[] = [],
): void {
  const resolvedLayoutFeatures = layoutFeatures.trim();
  ensureDir(path.dirname(outputPath));
  run(pyftsubset, [
    inputPath,
    `--output-file=${outputPath}`,
    '--flavor=woff2',
    `--text-file=${textFilePath}`,
    `--layout-features=${resolvedLayoutFeatures}`,
    '--ignore-missing-unicodes',
    '--no-hinting',
    ...extraArgs,
  ]);
}

function cleanGeneratedFonts(): void {
  rmSync(generatedFontRoot, { recursive: true, force: true });
}

function cleanLegacyPublicFonts(): void {
  rmSync(legacyPublicRoot, { recursive: true, force: true });
}

function cleanGeneratedRoot(): void {
  rmSync(generatedRoot, { recursive: true, force: true });
}

async function main(): Promise<void> {
  const pyftsubset = ensureFonttools();
  const entries = await loadContentEntries();
  const fontJobs = loadFontJobs();
  const selectorDocuments = buildSelectorDocuments(entries);
  const charsetInputRoot = mkdtempSync(path.join(tmpdir(), 'shinlog-fonts-'));

  cleanGeneratedRoot();
  cleanGeneratedFonts();
  cleanLegacyPublicFonts();

  try {
    for (const job of fontJobs) {
      const charsetText = collectCharsetText(entries, selectorDocuments, job.charsetSource);
      const charsetPath = writeCharsetInput(charsetInputRoot, job.id, charsetText);
      const inspection = inspectFont(job.inputPath);
      const layoutFeatures = buildLayoutFeatureSpec(
        job.features,
        inspection.features,
        inspection.requiredFeatures,
        job.excludeFeatures ?? [],
      );

      subsetFont(
        pyftsubset,
        job.inputPath,
        job.outputPath,
        charsetPath,
        layoutFeatures,
        job.extraArgs ?? [],
      );

      const includedText = inspectSubsetText(job.outputPath);
      const { autoKeptRequired, dropped, excluded, kept, missing } = resolveFeatureReport(
        job.features,
        inspection.features,
        inspection.requiredFeatures,
        job.excludeFeatures ?? [],
      );

      writeFontSnapshot({
        autoKeptRequiredFeatures: autoKeptRequired,
        droppedFeatures: dropped,
        excludedFeatures: excluded,
        id: job.id,
        includedCount: [...includedText].length,
        outputPath: job.outputPath,
        requestedCount: [...charsetText].length,
        keptFeatures: kept,
        requestedButMissing: missing,
        outputBytes: statSync(job.outputPath).size,
      }, includedText);
    }
  } finally {
    rmSync(charsetInputRoot, { recursive: true, force: true });
  }
}

await main();
