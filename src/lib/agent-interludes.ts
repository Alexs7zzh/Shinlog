import { getCollection } from 'astro:content';

import { SITE_TITLE } from '../consts';
import { renderAgentMarkdown } from './agent-markdown';
import { createAgentResponse, joinAgentSections } from './agent-response';
import { renderAgentText } from './agent-text';
import { formatHtmlDate } from './date';
import { getEntryLang } from './entry-locales';
import {
  getInterludeAnchor,
  getInterludeGroups,
  type InterludeGroup,
  type InterludeSource,
} from './interludes';

function getMetadata(): string[] {
  return [
    `Site: ${SITE_TITLE}`,
    'HTML: /interludes/',
    'Markdown: /interludes.md',
    'Text: /interludes.txt',
  ];
}

async function getInterludeGroupsFromContent(): Promise<InterludeGroup[]> {
  return getInterludeGroups(await getCollection('interludes'));
}

async function getInterludeMarkdown(entry: InterludeSource, canonical: InterludeSource): Promise<string> {
  const anchor = getInterludeAnchor(entry, canonical);
  const parts: Array<string | undefined> = [
    `## ${formatHtmlDate(entry.data.date)} (${getEntryLang(entry)})`,
    `Anchor: /interludes/#${anchor}`,
  ];

  if (entry.data.headnote) {
    parts.push(await renderAgentMarkdown(`:::aside\n${entry.data.headnote}\n:::`));
  }

  parts.push(await renderAgentMarkdown(entry.body ?? ''));

  return joinAgentSections(parts).trimEnd();
}

async function getInterludeText(entry: InterludeSource, canonical: InterludeSource): Promise<string> {
  const anchor = getInterludeAnchor(entry, canonical);
  const parts: Array<string | undefined> = [
    `${formatHtmlDate(entry.data.date)} (${getEntryLang(entry)})`,
    `Anchor: /interludes/#${anchor}`,
  ];

  if (entry.data.headnote) {
    parts.push(await renderAgentText(entry.data.headnote));
  }

  parts.push(await renderAgentText(entry.body ?? ''));

  return joinAgentSections(parts).trimEnd();
}

export async function getAgentInterludesMarkdown(): Promise<string> {
  const groups = await getInterludeGroupsFromContent();
  const entries = await Promise.all(
    groups.flatMap((group) => group.entries.map((entry) => getInterludeMarkdown(entry, group.canonical))),
  );

  return joinAgentSections(['# Interludes', getMetadata().join('\n'), ...entries]);
}

export async function getAgentInterludesText(): Promise<string> {
  const groups = await getInterludeGroupsFromContent();
  const entries = await Promise.all(
    groups.flatMap((group) => group.entries.map((entry) => getInterludeText(entry, group.canonical))),
  );

  return joinAgentSections(['Interludes', getMetadata().join('\n'), ...entries]);
}

export async function getAgentInterludesResponse(contentType: string): Promise<Response> {
  return createAgentResponse(contentType, {
    markdown: getAgentInterludesMarkdown,
    text: getAgentInterludesText,
  });
}
