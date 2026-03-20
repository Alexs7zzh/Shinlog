import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const contentRoot = path.join(repoRoot, 'src', 'content');
const generatedRoot = path.join(repoRoot, 'fonts', 'generated');
const publicRoot = path.join(repoRoot, 'public', 'fonts');
const venvRoot = path.join(repoRoot, 'fonts', '.venv');
const instanceRoot = path.join(generatedRoot, 'instances');

const printableAscii = Array.from({ length: 95 }, (_, index) => String.fromCharCode(index + 32)).join('');
const latinSeed = `${printableAscii}’‘“”–—…⸺•·一二三四五六七八九十`;
const latinLayoutFeatures = 'kern,liga,onum,calt,dlig,cv02,cv82,cv90,clig,swsh';
const cjkLayoutFeatures = 'vrt2,ccmp,locl,vert,vkrn,kern,liga,jp78,jp83,jp90,nlck,palt';

type EntryLang = 'en' | 'zh' | 'ja';

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

function buildStaticInstance(inputPath: string, outputPath: string, axis: string): void {
  ensureDir(path.dirname(outputPath));
  run(venvBin('python'), ['-m', 'fontTools.varLib.instancer', inputPath, axis, '--static', '-o', outputPath]);
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
  rmSync(instanceRoot, { recursive: true, force: true });
}

function main(): void {
  const pyftsubset = ensureFonttools();
  const glyphs = collectGlyphs();
  const latinTextPath = writeCharset('latin', glyphs.latin);
  const zhTextPath = writeCharset('zh', glyphs.zh);
  const jaTextPath = writeCharset('ja', glyphs.ja);
  const ebRegularInstance = path.join(instanceRoot, 'EBGaramond-Regular.ttf');
  const ebSemiBoldInstance = path.join(instanceRoot, 'EBGaramond-SemiBold.ttf');
  const ebItalicInstance = path.join(instanceRoot, 'EBGaramond-Italic.ttf');

  cleanPublicFonts();
  buildStaticInstance(path.join(repoRoot, 'fonts', 'source', 'eb-garamond', 'EBGaramond[wght].ttf'), ebRegularInstance, 'wght=400');
  buildStaticInstance(path.join(repoRoot, 'fonts', 'source', 'eb-garamond', 'EBGaramond[wght].ttf'), ebSemiBoldInstance, 'wght=600');
  buildStaticInstance(path.join(repoRoot, 'fonts', 'source', 'eb-garamond', 'EBGaramond-Italic[wght].ttf'), ebItalicInstance, 'wght=400');

  subsetFont(
    pyftsubset,
    ebRegularInstance,
    path.join(publicRoot, 'eb-garamond', 'eb-garamond-regular.woff2'),
    latinTextPath,
    latinLayoutFeatures,
  );
  subsetFont(
    pyftsubset,
    ebItalicInstance,
    path.join(publicRoot, 'eb-garamond', 'eb-garamond-italic.woff2'),
    latinTextPath,
    latinLayoutFeatures,
  );
  subsetFont(
    pyftsubset,
    ebSemiBoldInstance,
    path.join(publicRoot, 'eb-garamond', 'eb-garamond-semibold.woff2'),
    latinTextPath,
    latinLayoutFeatures,
  );
  subsetFont(
    pyftsubset,
    path.join(repoRoot, 'fonts', 'source', 'ia-duo', 'iAWriterDuoS-Regular.ttf'),
    path.join(publicRoot, 'ia-duo', 'ia-writer-duo-regular.woff2'),
    latinTextPath,
    latinLayoutFeatures,
  );
  subsetFont(
    pyftsubset,
    path.join(repoRoot, 'fonts', 'source', 'ia-duo', 'iAWriterDuoS-Italic.ttf'),
    path.join(publicRoot, 'ia-duo', 'ia-writer-duo-italic.woff2'),
    latinTextPath,
    latinLayoutFeatures,
  );
  subsetFont(
    pyftsubset,
    path.join(repoRoot, 'fonts', 'source', 'source-han-serif-cn', 'SourceHanSerifCN-Regular.otf'),
    path.join(publicRoot, 'SourceHanSerifCN', 'source-han-serif-cn-regular.woff2'),
    zhTextPath,
    cjkLayoutFeatures,
    ['--desubroutinize'],
  );
  subsetFont(
    pyftsubset,
    path.join(repoRoot, 'fonts', 'source', 'source-han-serif-jp', 'SourceHanSerifJP-Regular.otf'),
    path.join(publicRoot, 'SourceHanSerifJP', 'source-han-serif-jp-regular.woff2'),
    jaTextPath,
    cjkLayoutFeatures,
    ['--desubroutinize'],
  );

  rmSync(instanceRoot, { recursive: true, force: true });
}

main();
