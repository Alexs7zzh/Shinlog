import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

import { ENTRY_LANGS } from './consts';

const entryLangSchema = z.enum(ENTRY_LANGS);

const postSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.coerce.date(),
  lang: entryLangSchema.optional(),
  classes: z.array(z.string()).default([]),
  podcast: z.string().optional(),
}).strict();

const interludeSchema = z.object({
  date: z.coerce.date(),
  lang: entryLangSchema.optional(),
  headnote: z.string().optional(),
}).strict();

export const collections = {
  posts: defineCollection({
    loader: glob({ pattern: '**/[^_]*.md', base: './src/content/posts' }),
    schema: postSchema,
  }),
  interludes: defineCollection({
    loader: glob({ pattern: '**/[^_]*.md', base: './src/content/interludes' }),
    schema: interludeSchema,
  }),
};
