import { defineHastPlugin } from 'satteri';

import { getClassNames } from './markdown-attribute-lists.ts';
import type { AnyHastNode, HastNode } from './markdown-types.ts';

function isElement(node: AnyHastNode | undefined, tagName?: string): boolean {
  if (!node || node.type !== 'element') return false;
  return tagName ? node.tagName === tagName : true;
}

function isWhitespaceText(node: AnyHastNode | undefined): boolean {
  return node?.type === 'text' && typeof node.value === 'string' && node.value.trim().length === 0;
}

function getDirectiveName(node: AnyHastNode | undefined): string | null {
  if (!node?.properties) return null;
  const value = node.properties.dataDirective;
  return typeof value === 'string' ? value : null;
}

function copyPropertiesWithoutDirective(properties: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!properties) return {};

  const next = { ...properties };
  const encodedDirectiveProperties = typeof next.dataDirectiveProperties === 'string' ? next.dataDirectiveProperties : null;
  delete next.dataDirective;
  delete next.dataDirectiveProperties;

  if (!encodedDirectiveProperties) {
    return next;
  }

  try {
    const decoded = JSON.parse(encodedDirectiveProperties);
    if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) {
      return {
        ...decoded,
        ...next,
      };
    }
  } catch {
    return next;
  }

  return next;
}

function getLastMeaningfulChildIndex(children: AnyHastNode[]): number {
  for (let index = children.length - 1; index >= 0; index -= 1) {
    if (!isWhitespaceText(children[index])) {
      return index;
    }
  }

  return -1;
}

function createFigure(node: AnyHastNode, children: AnyHastNode[]): AnyHastNode {
  const properties = copyPropertiesWithoutDirective(node.properties);
  const className = [...new Set(['quote', ...getClassNames(properties)])];

  return {
    type: 'element',
    tagName: 'figure',
    properties: {
      ...properties,
      className,
    },
    children,
  };
}

function createBlockquote(children: AnyHastNode[]): AnyHastNode {
  return {
    type: 'element',
    tagName: 'blockquote',
    properties: {},
    children,
  };
}

function createFigcaption(node: AnyHastNode): AnyHastNode {
  return {
    type: 'element',
    tagName: 'figcaption',
    properties: {},
    children: node.children ?? [],
  };
}

function normalizeQuoteFigure(node: AnyHastNode): AnyHastNode {
  if (!isElement(node, 'figure') || !node.children || !getClassNames(node.properties).includes('quote')) {
    return node;
  }

  const firstChild = node.children.find((child) => isElement(child, 'blockquote'));
  if (!firstChild || !firstChild.properties) {
    return node;
  }

  const figureClassNames = getClassNames(node.properties);
  const blockquoteClassNames = getClassNames(firstChild.properties);

  if (blockquoteClassNames.length === 0) {
    return node;
  }

  const nextBlockquoteProperties = { ...firstChild.properties };
  delete nextBlockquoteProperties.className;

  return {
    ...node,
    properties: {
      ...node.properties,
      className: [...new Set([...figureClassNames, ...blockquoteClassNames])],
    },
    children: node.children.map((child) =>
      child === firstChild
        ? {
            ...child,
            properties: nextBlockquoteProperties,
          }
        : child,
    ),
  };
}

function transformQuote(node: AnyHastNode): AnyHastNode {
  const children = node.children ?? [];
  const attributionIndex = children.findIndex((child) => isElement(child) && getDirectiveName(child) === 'attribution');

  if (attributionIndex === -1) {
    return normalizeQuoteFigure(createFigure(node, [createBlockquote(children)]));
  }

  const attribution = children[attributionIndex];
  const before = children.slice(0, attributionIndex);
  const after = children.slice(attributionIndex + 1);
  const trailingIndex = getLastMeaningfulChildIndex(before);
  const quoteChildren = trailingIndex === -1 ? after : [...before.slice(0, trailingIndex + 1), ...after];

  return normalizeQuoteFigure(createFigure(node, [createBlockquote(quoteChildren), createFigcaption(attribution)]));
}

function getImageTitle(node: AnyHastNode): string | null {
  const title = node.properties?.title;
  return typeof title === 'string' && title.length > 0 ? title : null;
}

function removeImageTitle(node: AnyHastNode): AnyHastNode {
  if (!node.properties || typeof node.properties.title !== 'string') return node;
  const properties = { ...node.properties };
  delete properties.title;
  return {
    ...node,
    properties,
  };
}

function createFigcaptionNode(value: string): AnyHastNode {
  return {
    type: 'element',
    tagName: 'figcaption',
    properties: {},
    children: [
      {
        type: 'text',
        value,
      },
    ],
  };
}

function transformStandaloneImageParagraph(node: AnyHastNode): AnyHastNode {
  if (
    !isElement(node, 'p') ||
    !Array.isArray(node.children) ||
    node.children.length !== 1 ||
    !isElement(node.children[0], 'img')
  ) {
    return node;
  }

  const image = removeImageTitle(node.children[0]);
  const title = getImageTitle(node.children[0]);

  return {
    type: 'element',
    tagName: 'figure',
    properties: {},
    children: title ? [image, createFigcaptionNode(title)] : [image],
  };
}

export const satteriRehypeQuoteDirectives = defineHastPlugin({
  name: 'shinlog-rehype-quote-directives',
  element: {
    filter: [],
    visit(node) {
      const current = node as AnyHastNode;
      return getDirectiveName(current) === 'quote' ? (transformQuote(current) as HastNode) : undefined;
    },
  },
});

export const satteriRehypeFigureImages = defineHastPlugin({
  name: 'shinlog-rehype-figure-images',
  element: {
    filter: ['p'],
    visit(node) {
      return transformStandaloneImageParagraph(node as AnyHastNode) as HastNode;
    },
  },
});
