import { ENTRY_LANGS } from '../consts';

export type EntryLang = (typeof ENTRY_LANGS)[number];

export interface AlternativeLink {
  lang: EntryLang;
  url: string;
}
