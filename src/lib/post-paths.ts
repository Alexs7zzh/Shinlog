import path from 'node:path';

import { ENTRY_LANGS } from '../consts';
import type { CollectionEntry } from 'astro:content';
import type { AlternativeLink, EntryLang } from './types';

export type PostSource = CollectionEntry<'posts'>;

function getRawSlug(id: string): string {
  return path.basename(id, path.extname(id));
}

function stripLeadingIndex(value: string): string {
  return value.replace(/^\d+-/, '');
}

function stripLanguageSuffix(value: string): string {
  return value.replace(/-(ja|zh)$/, '');
}

export function getPostSlug(post: Pick<PostSource, 'id'>): string {
  return stripLanguageSuffix(stripLeadingIndex(getRawSlug(post.id)));
}

export function getPostLang(post: Pick<PostSource, 'id' | 'data'>): EntryLang {
  const rawSlug = getRawSlug(post.id);

  return post.data.lang ?? (rawSlug.endsWith('-ja') ? 'ja' : rawSlug.endsWith('-zh') ? 'zh' : 'en');
}

export function getPostUrl(post: Pick<PostSource, 'id' | 'data'>): string {
  const slug = getPostSlug(post);
  const lang = getPostLang(post);

  return lang === 'en' ? `/${slug}/` : `/${slug}/${lang}/`;
}

export function getPostAlternativeLinks(posts: PostSource[], slug: string): AlternativeLink[] {
  const group = posts.filter((post) => getPostSlug(post) === slug);

  if (group.length < 2) {
    return [];
  }

  return ENTRY_LANGS.flatMap((lang) => {
    const match = group.find((post) => getPostLang(post) === lang);
    return match ? [{ lang, url: getPostUrl(match) }] : [];
  });
}

export function validatePostLocales(posts: PostSource[]): void {
  const seen = new Map<string, string>();

  for (const post of posts) {
    const key = `${getPostSlug(post)}:${getPostLang(post)}`;
    const previous = seen.get(key);

    if (previous) {
      throw new Error(`Duplicate post locale "${key}" found in "${previous}" and "${post.id}".`);
    }

    seen.set(key, post.id);
  }
}
