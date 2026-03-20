import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkDirective from 'remark-directive';

import remarkAttributeLists from './src/lib/remark-attribute-lists';
import remarkDirectives from './src/lib/remark-directives';
import remarkTypography from './src/lib/remark-typography';
import rehypeFigureImages from './src/lib/rehype-figure-images';
import rehypeAttributeLists from './src/lib/rehype-attribute-lists';
import rehypePrefixFootnoteIds from './src/lib/rehype-prefix-footnote-ids';
import rehypeQuoteDirectives from './src/lib/rehype-quote-directives';
import rehypeTypography from './src/lib/rehype-typography';

export default defineConfig({
  site: 'https://shinlog.vercel.app',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  prefetch: {
    defaultStrategy: 'hover',
  },
  image: {
    layout: 'constrained',
    responsiveStyles: true,
  },
  markdown: {
    gfm: true,
    smartypants: true,
    remarkPlugins: [remarkDirective, remarkDirectives, remarkAttributeLists, remarkTypography],
    rehypePlugins: [rehypePrefixFootnoteIds, rehypeQuoteDirectives, rehypeAttributeLists, rehypeTypography, rehypeFigureImages],
  },
  integrations: [sitemap()],
});
