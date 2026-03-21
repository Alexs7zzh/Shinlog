import { ENTRY_LANGS } from '../consts';
import type { CollectionEntry } from 'astro:content';
import type { EntryLang } from './types';
import {
  getEntryAlternativeLinks,
  getEntryLang,
  getEntryRawSlug,
  stripLeadingIndex,
  stripLanguageSuffix,
  validateEntryLocales,
} from './entry-locales';

export type PostSource = CollectionEntry<'posts'>;

export function getPostSlug(post: Pick<PostSource, 'id'>): string {
  return stripLanguageSuffix(stripLeadingIndex(getEntryRawSlug(post)));
}

function getPostDefaultLang(posts: PostSource[], slug: string): EntryLang | undefined {
  const group = posts.filter((post) => getPostSlug(post) === slug);
  const baseVariant = group.find((post) => stripLeadingIndex(getEntryRawSlug(post)) === slug);
  if (baseVariant) {
    return getPostLang(baseVariant);
  }

  for (const lang of ENTRY_LANGS) {
    const variant = group.find((post) => getPostLang(post) === lang);
    if (variant) {
      return lang;
    }
  }

  return undefined;
}

export function getPostLang(post: Pick<PostSource, 'id' | 'data'>): EntryLang {
  return getEntryLang(post);
}

export function getPostUrl(post: Pick<PostSource, 'id' | 'data'>): string {
  const slug = getPostSlug(post);
  const lang = getPostLang(post);

  return lang === 'en' ? `/${slug}/` : `/${slug}/${lang}/`;
}

export function getPostAlternativeLinks(posts: PostSource[], slug: string) {
  return getEntryAlternativeLinks(posts, slug, getPostSlug, getPostUrl, getPostDefaultLang(posts, slug));
}

export function validatePostLocales(posts: PostSource[]): void {
  validateEntryLocales(posts, getPostSlug, 'post');
}
