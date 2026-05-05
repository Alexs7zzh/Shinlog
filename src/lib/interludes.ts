import type { CollectionEntry } from 'astro:content';

import { ENTRY_LANGS } from '../consts';
import {
  getEntryLang,
  getEntryRawSlug,
  stripLanguageSuffix,
  validateEntryLocales,
} from './entry-locales';
import { formatHtmlDate } from './date';

export type InterludeSource = CollectionEntry<'interludes'>;

export type InterludeGroup = {
  canonical: InterludeSource;
  canonicalAnchor: string;
  date: Date;
  entries: InterludeSource[];
};

export function getInterludeSlug(interlude: Pick<InterludeSource, 'id'>): string {
  return stripLanguageSuffix(getEntryRawSlug(interlude));
}

export function getCanonicalInterlude(interludes: InterludeSource[]): InterludeSource {
  const baseVariant = interludes.find((interlude) => getEntryRawSlug(interlude) === getInterludeSlug(interlude));
  if (baseVariant) {
    return baseVariant;
  }

  for (const lang of ENTRY_LANGS) {
    const variant = interludes.find((interlude) => getEntryLang(interlude) === lang);
    if (variant) {
      return variant;
    }
  }

  return interludes[0];
}

export function sortInterludeVariants(interludes: InterludeSource[], canonical: InterludeSource): InterludeSource[] {
  return [...interludes].sort((left, right) => {
    if (left.id === canonical.id) return -1;
    if (right.id === canonical.id) return 1;

    return ENTRY_LANGS.indexOf(getEntryLang(left)) - ENTRY_LANGS.indexOf(getEntryLang(right));
  });
}

export function validateInterludeDates(interludes: InterludeSource[]): void {
  const datesBySlug = new Map<string, string>();

  for (const interlude of interludes) {
    const slug = getInterludeSlug(interlude);
    const date = formatHtmlDate(interlude.data.date);
    const previous = datesBySlug.get(slug);

    if (previous && previous !== date) {
      throw new Error(
        `Interlude locale group "${slug}" must share one date, but found "${previous}" and "${date}" (entry "${interlude.id}").`,
      );
    }

    datesBySlug.set(slug, date);
  }
}

export function validateInterludes(interludes: InterludeSource[]): void {
  validateEntryLocales(interludes, getInterludeSlug, 'interlude');
  validateInterludeDates(interludes);
}

export function getInterludeAnchor(interlude: InterludeSource, canonical: InterludeSource): string {
  const date = formatHtmlDate(interlude.data.date);

  return interlude.id === canonical.id ? date : `${date}-${getEntryLang(interlude)}`;
}

export function getInterludeGroups(interludes: InterludeSource[]): InterludeGroup[] {
  validateInterludes(interludes);

  return Array.from(
    interludes.reduce((groups, interlude) => {
      const slug = getInterludeSlug(interlude);
      const group = groups.get(slug) ?? [];
      group.push(interlude);
      groups.set(slug, group);
      return groups;
    }, new Map<string, InterludeSource[]>()),
  )
    .map(([, variants]) => {
      const canonical = getCanonicalInterlude(variants);
      const entries = sortInterludeVariants(variants, canonical);

      return {
        canonical,
        canonicalAnchor: getInterludeAnchor(canonical, canonical),
        date: canonical.data.date,
        entries,
      };
    })
    .sort((left, right) => left.date.getTime() - right.date.getTime());
}
