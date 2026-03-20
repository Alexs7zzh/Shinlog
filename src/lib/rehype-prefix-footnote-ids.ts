import path from 'node:path';

type HastNode = {
  children?: unknown[];
  properties?: Record<string, unknown>;
  tagName?: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getPrefix(file: { history?: string[]; path?: string }): string {
  const filePath = file.history?.[0] ?? file.path ?? 'content';
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

function visit(node: HastNode, visitor: (node: HastNode) => void): void {
  visitor(node);

  for (const child of node.children ?? []) {
    if (child && typeof child === 'object') {
      visit(child as HastNode, visitor);
    }
  }
}

export default function rehypePrefixFootnoteIds(): any {
  return (tree: HastNode, file: { history?: string[]; path?: string }) => {
    const prefix = getPrefix(file);

    visit(tree, (node) => {
      if (!node.properties) return;

      const { properties } = node;

      if (typeof properties.id === 'string') {
        properties.id = rewriteFootnoteId(properties.id, prefix);
      }

      if (typeof properties.href === 'string') {
        properties.href = rewriteFootnoteHref(properties.href, prefix);
      }

      properties.ariaDescribedBy = rewriteDescribedBy(properties.ariaDescribedBy, prefix);
      properties['aria-describedby'] = rewriteDescribedBy(properties['aria-describedby'], prefix);

      if (Array.isArray(properties.className)) {
        const classNames = properties.className.filter(
          (item): item is string => typeof item === 'string',
        );

        if (classNames.includes('data-footnote-backref') && !classNames.includes('footnote-backref')) {
          properties.className = [...classNames, 'footnote-backref'];
        }
      }

      if (node.tagName === 'h2' && properties.id === `footnote-label-${prefix}`) {
        const classNames = Array.isArray(properties.className)
          ? properties.className.filter((item): item is string => typeof item === 'string')
          : [];

        if (!classNames.includes('sr-only')) {
          properties.className = [...classNames, 'sr-only'];
        }
      }
    });
  };
}
