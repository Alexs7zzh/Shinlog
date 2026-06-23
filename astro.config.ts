import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import sitemap from '@astrojs/sitemap';

import {
  markdownHastAttributeLists,
  markdownHastFigureImages,
  markdownHastMarkEndElement,
  markdownHastPrefixFootnoteIds,
  markdownHastQuoteDirectives,
  markdownHastTypography,
  markdownMdastAttributeLists,
  markdownMdastDirectives,
  markdownMdastMarkEndElement,
  markdownMdastTypography,
} from './src/lib/markdown-processor.ts';

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
    processor: satteri({
      features: {
        directive: true,
        gfm: true,
        smartPunctuation: true,
      },
      mdastPlugins: [
        markdownMdastDirectives,
        markdownMdastAttributeLists,
        markdownMdastTypography,
        markdownMdastMarkEndElement,
      ],
      hastPlugins: [
        markdownHastPrefixFootnoteIds,
        markdownHastQuoteDirectives,
        markdownHastAttributeLists,
        markdownHastTypography,
        markdownHastFigureImages,
        markdownHastMarkEndElement,
      ],
    }),
  },
  integrations: [sitemap()],
});
