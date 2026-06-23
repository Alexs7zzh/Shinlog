import { pathToFileURL } from 'node:url';
import { markdownToHtml } from 'satteri';

import {
  satteriRehypeAttributeLists,
  satteriRehypeFigureImages,
  satteriRehypeMarkEndElement,
  satteriRehypePrefixFootnoteIds,
  satteriRehypeQuoteDirectives,
  satteriRehypeTypography,
  satteriRemarkAttributeLists,
  satteriRemarkDirectives,
  satteriRemarkMarkEndElement,
  satteriRemarkTypography,
} from './markdown-processor.ts';

function renderMarkdown(markdown: string, filePath?: string): string {
  return markdownToHtml(markdown, {
    fileURL: filePath ? pathToFileURL(filePath) : undefined,
    features: {
      directive: true,
      gfm: true,
      smartPunctuation: true,
    },
    mdastPlugins: [
      satteriRemarkDirectives,
      satteriRemarkAttributeLists,
      satteriRemarkTypography,
      satteriRemarkMarkEndElement,
    ],
    hastPlugins: [
      satteriRehypePrefixFootnoteIds,
      satteriRehypeQuoteDirectives,
      satteriRehypeAttributeLists,
      satteriRehypeTypography,
      satteriRehypeFigureImages,
      satteriRehypeMarkEndElement,
    ],
  }).html;
}

export async function renderMarkdownFragment(markdown: string): Promise<string> {
  return renderMarkdown(markdown);
}

export async function renderMarkdownFragmentWithPath(markdown: string, filePath: string): Promise<string> {
  return renderMarkdown(markdown, filePath);
}

export async function renderMarkdownFragmentWithPrefix(markdown: string, prefix: string): Promise<string> {
  return renderMarkdown(markdown, `${prefix}.md`);
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
