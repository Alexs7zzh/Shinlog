import { unified } from 'unified';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import remarkSmartypants from 'remark-smartypants';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';

import rehypeAttributeLists from './rehype-attribute-lists';
import rehypeFigureImages from './rehype-figure-images';
import rehypeMarkEndElement from './rehype-mark-end-element';
import rehypePrefixFootnoteIds from './rehype-prefix-footnote-ids';
import rehypeQuoteDirectives from './rehype-quote-directives';
import rehypeTypography from './rehype-typography';
import remarkAttributeLists from './remark-attribute-lists';
import remarkDirectives from './remark-directives';
import remarkTypography from './remark-typography';

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

export async function renderMarkdownFragment(markdown: string): Promise<string> {
  return String(await markdownFragmentProcessor.process(markdown));
}

export async function renderMarkdownFragmentWithPrefix(markdown: string, prefix: string): Promise<string> {
  return String(
    await markdownFragmentProcessor.process({
      path: `${prefix}.md`,
      value: markdown,
    }),
  );
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
