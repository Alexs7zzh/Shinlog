import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import sitemap from '@astrojs/sitemap';

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
    }),
  },
  integrations: [sitemap()],
});
