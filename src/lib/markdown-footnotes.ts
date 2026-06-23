import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineHastPlugin } from 'satteri';

import { getClassNames } from './markdown-attribute-lists.ts';
import type { AnyHastNode, HastContext, HastNode } from './markdown-types.ts';

const textFootnoteBackref = '↩\uFE0E';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getPrefix(fileURL: URL | undefined): string {
  if (!fileURL) return 'content';
  const filePath = fileURL.protocol === 'file:' ? fileURLToPath(fileURL) : fileURL.pathname;
  return slugify(path.basename(filePath, path.extname(filePath))) || 'content';
}

function rewriteFootnoteId(value: string, prefix: string): string {
  if (value === 'footnote-label') {
    return `footnote-label-${prefix}`;
  }

  const match = value.match(/^(?:user-content-)?(fn|fnref)-(.+)$/);
  if (!match) return value;

  const [, kind, suffix] = match;
  return `${kind}-${prefix}-${suffix}`;
}

function rewriteFootnoteHref(value: string, prefix: string): string {
  if (!value.startsWith('#')) return value;

  const next = rewriteFootnoteId(value.slice(1), prefix);
  return next === value.slice(1) ? value : `#${next}`;
}

function rewriteDescribedBy(value: unknown, prefix: string): unknown {
  if (typeof value === 'string') {
    return rewriteFootnoteId(value, prefix);
  }

  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'string' ? rewriteFootnoteId(item, prefix) : item));
  }

  return value;
}

function isFootnoteBackref(properties: Record<string, unknown>): boolean {
  const classNames = getClassNames(properties);

  return (
    classNames.includes('data-footnote-backref') ||
    classNames.includes('footnote-backref') ||
    properties.dataFootnoteBackref !== undefined ||
    properties['data-footnote-backref'] !== undefined
  );
}

function applyFootnotePrefix(node: AnyHastNode, ctx: HastContext): AnyHastNode {
  if (!node.properties) return node;

  const prefix = getPrefix(ctx.fileURL);
  const properties = { ...node.properties };

  if (typeof properties.id === 'string') {
    properties.id = rewriteFootnoteId(properties.id, prefix);
  }

  if (typeof properties.href === 'string') {
    properties.href = rewriteFootnoteHref(properties.href, prefix);
  }

  properties.ariaDescribedBy = rewriteDescribedBy(properties.ariaDescribedBy, prefix);
  properties['aria-describedby'] = rewriteDescribedBy(properties['aria-describedby'], prefix);

  if (Array.isArray(properties.className)) {
    const classNames = getClassNames(properties);

    if (classNames.includes('data-footnote-backref') && !classNames.includes('footnote-backref')) {
      properties.className = [...classNames, 'footnote-backref'];
    }
  }

  const children = isFootnoteBackref(properties) ? [{ type: 'text', value: textFootnoteBackref } as AnyHastNode] : node.children;

  if (node.tagName === 'h2' && properties.id === `footnote-label-${prefix}`) {
    const classNames = getClassNames(properties);

    if (!classNames.includes('sr-only')) {
      properties.className = [...classNames, 'sr-only'];
    }
  }

  return {
    ...node,
    children,
    properties,
  };
}

export const satteriRehypePrefixFootnoteIds = defineHastPlugin({
  name: 'shinlog-rehype-prefix-footnote-ids',
  element: {
    filter: [],
    visit(node, ctx) {
      return applyFootnotePrefix(node as AnyHastNode, ctx as unknown as HastContext) as HastNode;
    },
  },
});
