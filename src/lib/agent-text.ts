import { renderMarkdownFragment } from './render-markdown-fragment';

export function normalizePlainText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(address|article|aside|blockquote|div|figcaption|figure|footer|h[1-6]|header|li|main|ol|p|section|ul)>/gi, '\n')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

export async function renderAgentText(markdown: string): Promise<string> {
  return normalizePlainText(await renderMarkdownFragment(markdown));
}
