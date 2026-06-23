import { defineMdastPlugin } from 'satteri';

import { isSafeAttributeName } from './markdown-attribute-lists.ts';
import type { AnyMdastNode, MdastNode } from './markdown-types.ts';

function normalizeClassName(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(/\s+/).filter(Boolean);
}

function getSafeProperties(
  attributes: Record<string, string | null | undefined> | null | undefined,
): Record<string, unknown> {
  if (!attributes) return {};

  const properties: Record<string, unknown> = {};
  const classNames = normalizeClassName(attributes.class);

  if (classNames.length > 0) {
    properties.className = classNames;
  }

  if (attributes.id) {
    properties.id = attributes.id;
  }

  for (const [name, value] of Object.entries(attributes)) {
    if (name === 'class' || name === 'id' || value == null) continue;
    if (!isSafeAttributeName(name)) continue;
    properties[name] = value;
  }

  return properties;
}

function getPositionLabel(node: AnyMdastNode): string {
  const line = node.position?.start?.line;
  const column = node.position?.start?.column;
  if (line == null || column == null) return 'unknown position';
  return `${line}:${column}`;
}

function getDirectiveData(node: AnyMdastNode): AnyMdastNode['data'] | null {
  if (node.type === 'containerDirective' && node.name === 'aside') {
    return {
      hName: 'aside',
      hProperties: getSafeProperties(node.attributes),
    };
  }

  if (node.type === 'textDirective' && node.name === 'span') {
    return {
      hName: 'span',
      hProperties: getSafeProperties(node.attributes),
    };
  }

  if (node.type === 'containerDirective' && node.name === 'quote') {
    return {
      hName: 'div',
      hProperties: {
        dataDirective: 'quote',
        dataDirectiveProperties: JSON.stringify(getSafeProperties(node.attributes)),
      },
    };
  }

  if (node.type === 'leafDirective' && node.name === 'attribution') {
    return {
      hName: 'div',
      hProperties: {
        ...getSafeProperties(node.attributes),
        dataDirective: 'attribution',
      },
    };
  }

  return null;
}

function validateDirective(node: AnyMdastNode): void {
  if (!node.type.endsWith('Directive')) return;
  if (getDirectiveData(node)) return;

  if (node.name === 'aside') {
    throw new Error(`Invalid aside directive at ${getPositionLabel(node)}. Use :::aside{...} as a block directive.`);
  }

  if (node.name === 'span') {
    throw new Error(`Invalid span directive at ${getPositionLabel(node)}. Use :span[...] as an inline directive.`);
  }

  if (node.name === 'quote') {
    throw new Error(`Invalid quote directive at ${getPositionLabel(node)}. Use :::quote{...} as a block directive.`);
  }

  if (node.name === 'attribution') {
    throw new Error(`Invalid attribution directive at ${getPositionLabel(node)}. Use ::attribution[...] inside :::quote.`);
  }
}

function applyDirectiveData(node: AnyMdastNode): AnyMdastNode {
  validateDirective(node);

  const data = getDirectiveData(node);
  if (!data) return node;

  return {
    ...node,
    data: {
      ...node.data,
      ...data,
    },
  };
}

export const markdownMdastDirectives = defineMdastPlugin({
  name: 'shinlog-mdast-directives',
  containerDirective(node) {
    return applyDirectiveData(node as AnyMdastNode) as MdastNode;
  },
  leafDirective(node) {
    return applyDirectiveData(node as AnyMdastNode) as MdastNode;
  },
  textDirective(node) {
    return applyDirectiveData(node as AnyMdastNode) as MdastNode;
  },
});
