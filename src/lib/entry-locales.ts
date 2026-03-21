import path from 'node:path';

import { ENTRY_LANGS } from '../consts';
import type { AlternativeLink, EntryLang } from './types';

type EntryIdSource = {
  id: string;
};

type EntryLocaleSource = EntryIdSource & {
  data: {
    lang?: EntryLang;
  };
};

function getRawSlug(id: string): string {
  return path.basename(id, path.extname(id));
}

export function getEntryRawSlug(entry: Pick<EntryIdSource, 'id'>): string {
  return getRawSlug(entry.id);
}

export function stripLeadingIndex(value: string): string {
  return value.replace(/^\d+-/, '');
}

export function stripLanguageSuffix(value: string): string {
  return value.replace(/-(ja|zh)$/, '');
}

export function getEntryLang(entry: Pick<EntryLocaleSource, 'id' | 'data'>): EntryLang {
  const rawSlug = getRawSlug(entry.id);

  return entry.data.lang ?? (rawSlug.endsWith('-ja') ? 'ja' : rawSlug.endsWith('-zh') ? 'zh' : 'en');
}

export function getEntryAlternativeLinks<T extends EntryLocaleSource>(
  entries: T[],
  slug: string,
  getSlug: (entry: T) => string,
  getUrl: (entry: T) => string,
  preferredFirstLang?: EntryLang,
): AlternativeLink[] {
  const group = entries.filter((entry) => getSlug(entry) === slug);

  if (group.length < 2) {
    return [];
  }

  const orderedLangs = preferredFirstLang
    ? [preferredFirstLang, ...ENTRY_LANGS.filter((lang) => lang !== preferredFirstLang)]
    : ENTRY_LANGS;

  return orderedLangs.flatMap((lang) => {
    const match = group.find((entry) => getEntryLang(entry) === lang);
    return match ? [{ lang, url: getUrl(match) }] : [];
  });
}

export function validateEntryLocales<T extends EntryLocaleSource>(
  entries: T[],
  getSlug: (entry: T) => string,
  label: string,
): void {
  const seen = new Map<string, string>();

  for (const entry of entries) {
    const key = `${getSlug(entry)}:${getEntryLang(entry)}`;
    const previous = seen.get(key);

    if (previous) {
      throw new Error(`Duplicate ${label} locale "${key}" found in "${previous}" and "${entry.id}".`);
    }

    seen.set(key, entry.id);
  }
}
