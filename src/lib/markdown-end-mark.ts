import { defineHastPlugin, defineMdastPlugin } from 'satteri';

import { getClassNames, mergeMdastAttributes } from './markdown-attribute-lists.ts';
import type { AnyHastNode, AnyMdastNode, HastContext, HastNode, MdastContext, MdastNode } from './markdown-types.ts';

const MDAST_END_MARK_TARGETS = new Set(['blockquote', 'heading', 'list', 'paragraph']);

function isIgnorableMdastRootChild(node: AnyMdastNode | undefined): boolean {
  if (!node) return true;

  if (node.type === 'html') {
    return typeof node.value !== 'string' || node.value.trim().length === 0;
  }

  return false;
}

function markMdastEndElement(node: AnyMdastNode, ctx: MdastContext): AnyMdastNode | undefined {
  const parent = ctx.parent(node);
  if (!parent || parent.type !== 'root' || !Array.isArray(parent.children)) return undefined;

  const nodeIndex = ctx.indexOf(node);
  if (nodeIndex == null) return undefined;

  for (let index = parent.children.length - 1; index >= 0; index -= 1) {
    const child = parent.children[index];

    if (isIgnorableMdastRootChild(child)) {
      continue;
    }

    if (index !== nodeIndex || !MDAST_END_MARK_TARGETS.has(node.type)) {
      return undefined;
    }

    return mergeMdastAttributes(node, { className: ['end-mark'] });
  }

  return undefined;
}

function isElement(node: AnyHastNode | undefined): boolean {
  return Boolean(node && node.type === 'element');
}

function hasClass(node: AnyHastNode, className: string): boolean {
  return getClassNames(node.properties).includes(className);
}

function isIgnorableRootChild(node: AnyHastNode | undefined): boolean {
  if (!node) return true;

  if (node.type === 'text') {
    return typeof node.value !== 'string' || node.value.trim().length === 0;
  }

  return isElement(node) && node.tagName === 'section' && hasClass(node, 'footnotes');
}

function markEndElementForParent(node: AnyHastNode, ctx: HastContext): AnyHastNode | undefined {
  const parent = ctx.parent(node);
  if (!parent || parent.type !== 'root' || !Array.isArray(parent.children)) return undefined;

  const nodeIndex = ctx.indexOf(node);
  if (nodeIndex == null) return undefined;

  for (let index = parent.children.length - 1; index >= 0; index -= 1) {
    const child = parent.children[index];

    if (isIgnorableRootChild(child) || !isElement(child)) {
      continue;
    }

    if (index !== nodeIndex) return undefined;

    const classNames = getClassNames(node.properties);
    if (!classNames.includes('end-mark')) {
      return {
        ...node,
        properties: {
          ...node.properties,
          className: [...classNames, 'end-mark'],
        },
      };
    }
    return undefined;
  }

  return undefined;
}

export const satteriRemarkMarkEndElement = defineMdastPlugin({
  name: 'shinlog-remark-mark-end-element',
  blockquote(node, ctx) {
    return markMdastEndElement(node as AnyMdastNode, ctx as MdastContext) as MdastNode | undefined;
  },
  heading(node, ctx) {
    return markMdastEndElement(node as AnyMdastNode, ctx as MdastContext) as MdastNode | undefined;
  },
  list(node, ctx) {
    return markMdastEndElement(node as AnyMdastNode, ctx as MdastContext) as MdastNode | undefined;
  },
  paragraph(node, ctx) {
    return markMdastEndElement(node as AnyMdastNode, ctx as MdastContext) as MdastNode | undefined;
  },
});

export const satteriRehypeMarkEndElement = defineHastPlugin({
  name: 'shinlog-rehype-mark-end-element',
  element: {
    filter: [],
    visit(node, ctx) {
      return markEndElementForParent(node as AnyHastNode, ctx as unknown as HastContext) as HastNode | undefined;
    },
  },
});
