import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';

import remarkAttributeLists from './remark-attribute-lists';

type MarkdownNode = {
  type: string;
  name?: string;
  value?: string;
  attributes?: Record<string, string | null | undefined> | null;
  children?: MarkdownNode[];
};

function getAttributionChildren(node: MarkdownNode): MarkdownNode[] {
  const label = node.children?.find((child) => child.type === 'paragraph' && child.children);

  return label?.children ?? node.children ?? [];
}

function normalizeQuote(node: MarkdownNode): MarkdownNode {
  const quoteChildren: MarkdownNode[] = [];
  const attributionChildren: MarkdownNode[] = [];

  for (const child of node.children ?? []) {
    if (child.type === 'leafDirective' && child.name === 'attribution') {
      attributionChildren.push(...getAttributionChildren(child));
    } else {
      quoteChildren.push(...normalizeNode(child, node));
    }
  }

  if (attributionChildren.length > 0) {
    quoteChildren.push({
      type: 'paragraph',
      children: [
        {
          type: 'emphasis',
          children: attributionChildren,
        },
      ],
    });
  }

  return {
    type: 'blockquote',
    children: quoteChildren,
  };
}

function normalizeAside(node: MarkdownNode): MarkdownNode {
  const children = (node.children ?? []).flatMap((child) => normalizeNode(child, node));

  return {
    type: 'blockquote',
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'html', value: '[!NOTE]' }],
      },
      ...children,
    ],
  };
}

function normalizeNode(node: MarkdownNode, parent?: MarkdownNode): MarkdownNode[] {
  if (node.type === 'containerDirective' && node.name === 'quote') {
    return [normalizeQuote(node)];
  }

  if (node.type === 'containerDirective' && node.name === 'aside') {
    return [normalizeAside(node)];
  }

  if (node.type === 'html') {
    const value = (node.value ?? '').trim();
    const textValue = value.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?span\b[^>]*>/gi, '');
    if (textValue !== value) {
      const text = textValue.trim();
      if (text.length === 0) {
        return [];
      }

      if (parent?.type === 'root' || parent?.type === 'blockquote' || parent?.type === 'containerDirective') {
        return [
          {
            type: 'paragraph',
            children: [{ type: 'text', value: text }],
          },
        ];
      }

      return [{ type: 'text', value: textValue }];
    }
  }

  if (node.children) {
    node.children = node.children.flatMap((child) => normalizeNode(child, node));
  }

  if (node.type === 'leafDirective' && node.name === 'attribution') {
    return [
      {
        type: 'paragraph',
        children: [
          {
            type: 'emphasis',
            children: getAttributionChildren(node),
          },
        ],
      },
    ];
  }

  if (node.type === 'textDirective' && node.name === 'span') {
    return node.children ?? [];
  }

  if (node.type.endsWith('Directive')) {
    return node.children ?? [];
  }

  return [node];
}

function portableMarkdown() {
  return function transformer(tree: MarkdownNode) {
    if (!tree.children) return;

    tree.children = tree.children.flatMap((child) => normalizeNode(child, tree));
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkDirective)
  .use(remarkAttributeLists)
  .use(portableMarkdown)
  .use(remarkStringify, {
    bullet: '-',
    fences: true,
    rule: '-',
  });

export async function renderAgentMarkdown(markdown: string): Promise<string> {
  return String(await processor.process(markdown)).trimEnd();
}
