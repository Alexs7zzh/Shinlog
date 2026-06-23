import { defineHastPlugin, defineMdastPlugin } from 'satteri';

import type {
  AnyHastNode,
  AnyMdastNode,
  Attributes,
  HastContext,
  HastNode,
  MdastContext,
  MdastNode,
} from './markdown-types.ts';

const ATTRIBUTE_TOKEN =
  /\s*(?:\.([A-Za-z0-9_-]+)|#([A-Za-z0-9_-]+)|([A-Za-z_:][A-Za-z0-9_:-]*)(?:=(?:"([^"]*)"|'([^']*)'|([^\s"'=}{]+)))?)/y;
const SAFE_ATTRIBUTE_NAMES = [/^lang$/, /^data-[A-Za-z0-9_:-]+$/, /^aria-[A-Za-z0-9_:-]+$/];
const MDAST_INLINE_ATTRIBUTE_TARGETS = new Set([
  'delete',
  'emphasis',
  'image',
  'imageReference',
  'inlineCode',
  'link',
  'linkReference',
  'strong',
]);
const MDAST_CONTAINER_ATTRIBUTE_TARGETS = new Set(['blockquote', 'listItem']);
const MDAST_TEXT_CONTAINER_TARGETS = new Set(['heading', 'paragraph']);
const HAST_INLINE_ATTRIBUTE_TARGETS = new Set(['a', 'code', 'del', 'em', 'img', 'span', 'strong']);
const HAST_CONTAINER_ATTRIBUTE_TARGETS = new Set(['blockquote', 'li']);
const HAST_TEXT_CONTAINER_TARGETS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'p']);

export function isSafeAttributeName(name: string): boolean {
  return SAFE_ATTRIBUTE_NAMES.some((pattern) => pattern.test(name));
}

export function parseAttributeList(value: string): Attributes | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

  const inner = trimmed.slice(1, -1).trim();
  if (inner.length === 0) return null;

  const attributes: Attributes = {};
  let index = 0;

  while (index < inner.length) {
    ATTRIBUTE_TOKEN.lastIndex = index;
    const match = ATTRIBUTE_TOKEN.exec(inner);
    if (!match) return null;

    const [, className, id, name, doubleQuoted, singleQuoted, bareValue] = match;

    if (className) {
      attributes.className = [...(attributes.className ?? []), className];
    } else if (id) {
      attributes.id = id;
    } else if (name) {
      if (!isSafeAttributeName(name)) return null;
      attributes[name] = doubleQuoted ?? singleQuoted ?? bareValue ?? true;
    }

    index = ATTRIBUTE_TOKEN.lastIndex;
  }

  return attributes;
}

function parsePrefixAttributeList(value: string): { attributes: Attributes; text: string } | null {
  const match = value.match(/^(\{[^{}]+\})(.*)$/s);
  if (!match) return null;

  const attributes = parseAttributeList(match[1]);
  if (!attributes) return null;

  return {
    attributes,
    text: match[2],
  };
}

function parseSuffixAttributeList(
  value: string,
): { attributes: Attributes; separator: string | null; text: string } | null {
  const directMatch = value.match(/^(\{[^{}]+\})$/s);
  if (directMatch) {
    const attributes = parseAttributeList(directMatch[1]);
    if (!attributes) return null;

    return {
      attributes,
      separator: null,
      text: '',
    };
  }

  const match = value.match(/^(.*?)(\s+)(\{[^{}]+\})$/s);
  if (!match) return null;

  const attributes = parseAttributeList(match[3]);
  if (!attributes) return null;

  return {
    attributes,
    separator: match[2],
    text: match[1],
  };
}

export function getClassNames(properties: Record<string, unknown> | undefined): string[] {
  const className = properties?.className;
  if (Array.isArray(className)) {
    return className.filter((value): value is string => typeof value === 'string');
  }

  if (typeof className === 'string') {
    return className.split(/\s+/).filter(Boolean);
  }

  return [];
}

export function mergeProperties(
  properties: Record<string, unknown> | undefined,
  attributes: Attributes,
): Record<string, unknown> {
  const nextProperties = { ...(properties ?? {}) };
  const nextClasses = [...getClassNames(properties)];

  if (attributes.className) {
    for (const className of attributes.className) {
      if (!nextClasses.includes(className)) {
        nextClasses.push(className);
      }
    }
  }

  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'className') continue;
    nextProperties[key] = value;
  }

  if (nextClasses.length > 0) {
    nextProperties.className = nextClasses;
  }

  return nextProperties;
}

export function mergeMdastAttributes(node: AnyMdastNode, attributes: Attributes): AnyMdastNode {
  const data = node.data ?? {};

  return {
    ...node,
    data: {
      ...data,
      hProperties: mergeProperties(data.hProperties, attributes),
    },
  };
}

export function mergeHastAttributes(node: AnyHastNode, attributes: Attributes): AnyHastNode {
  return {
    ...node,
    properties: mergeProperties(node.properties, attributes),
  };
}

export function getTextValue(node: AnyMdastNode | AnyHastNode | undefined): string {
  return node?.type === 'text' ? node.value ?? '' : '';
}

function getExactMdastAttributeList(node: AnyMdastNode | undefined): Attributes | null {
  if (!node) return null;

  if (node.type === 'text') {
    return parseAttributeList(node.value ?? '');
  }

  if (node.type === 'mdxTextExpression') {
    return parseAttributeList(`{${node.value ?? ''}}`);
  }

  return null;
}

function getMdastInlineAttributes(node: AnyMdastNode): { attributes: Attributes; text: string | null } | null {
  if (node.type === 'text') {
    const value = node.value ?? '';
    if (/^\s/.test(value)) return null;
    return parsePrefixAttributeList(value);
  }

  if (node.type === 'mdxTextExpression') {
    const attributes = parseAttributeList(`{${node.value ?? ''}}`);
    if (!attributes) return null;

    return {
      attributes,
      text: null,
    };
  }

  return null;
}

function stripMdastTrailingAttributeList(
  node: AnyMdastNode,
  parent: AnyMdastNode | undefined,
  ctx: MdastContext,
): AnyMdastNode {
  if (!MDAST_TEXT_CONTAINER_TARGETS.has(node.type) || !node.children || node.children.length === 0) {
    return node;
  }

  const lastChild = node.children.at(-1);
  if (!lastChild) return node;

  let parsed = lastChild.type === 'text' ? parseSuffixAttributeList(lastChild.value ?? '') : null;
  let nextChildren = [...node.children];

  if (!parsed && lastChild.type === 'mdxTextExpression') {
    const attributes = getExactMdastAttributeList(lastChild);
    if (!attributes) return node;

    const previousChild = nextChildren.at(-2);
    const previousText = getTextValue(previousChild);
    const separatorMatch = previousText.match(/(\s+)$/s);
    const separator = separatorMatch?.[1] ?? null;

    if (nextChildren.length >= 2 && separator == null) {
      return node;
    }

    parsed = {
      attributes,
      separator,
      text: previousText.slice(0, previousText.length - (separator?.length ?? 0)),
    };

    if (previousChild?.type === 'text') {
      const replacement = {
        ...previousChild,
        value: parsed.text,
      };
      nextChildren[nextChildren.length - 2] = replacement;
      if (parsed.text.length === 0) {
        nextChildren.splice(nextChildren.length - 2, 1);
      }
    }

    nextChildren = nextChildren.slice(0, -1);
  }

  if (!parsed) return node;

  const appliesToContainer =
    node.type === 'paragraph' &&
    parent?.children &&
    ctx.indexOf(node) === parent.children.length - 1 &&
    MDAST_CONTAINER_ATTRIBUTE_TARGETS.has(parent.type) &&
    parsed.separator?.includes('\n');

  if (appliesToContainer) {
    return node;
  }

  if (parsed.separator === null && nextChildren.length < 2) {
    return node;
  }

  if (lastChild.type === 'text') {
    const replacement = {
      ...lastChild,
      value: parsed.text,
    };
    nextChildren[nextChildren.length - 1] = replacement;
    if (parsed.text.length === 0) {
      nextChildren = nextChildren.slice(0, -1);
    }
  }

  return mergeMdastAttributes(
    {
      ...node,
      children: nextChildren,
    },
    parsed.attributes,
  );
}

function applyMdastInlineAttributeLists(node: AnyMdastNode): AnyMdastNode {
  if (!node.children || node.children.length < 2) return node;

  const nextChildren: AnyMdastNode[] = [];

  for (const child of node.children) {
    const parsed = getMdastInlineAttributes(child);
    if (parsed) {
      const previous = nextChildren.at(-1);

      if (previous && MDAST_INLINE_ATTRIBUTE_TARGETS.has(previous.type)) {
        nextChildren[nextChildren.length - 1] = mergeMdastAttributes(previous, parsed.attributes);

        if (parsed.text && parsed.text.length > 0) {
          nextChildren.push({
            ...child,
            value: parsed.text,
          });
        }

        continue;
      }
    }

    nextChildren.push(child);
  }

  return {
    ...node,
    children: nextChildren,
  };
}

function applyMdastStandaloneAttributeLists(node: AnyMdastNode): AnyMdastNode {
  if (!node.children || node.children.length < 2) return node;

  const nextChildren: AnyMdastNode[] = [];

  for (const [index, child] of node.children.entries()) {
    const previous = nextChildren.at(-1);
    const onlyChild = child.children?.length === 1 ? child.children[0] : undefined;
    const attributes = child.type === 'paragraph' ? getExactMdastAttributeList(onlyChild) : null;

    if (attributes && previous) {
      const target =
        MDAST_CONTAINER_ATTRIBUTE_TARGETS.has(node.type) && index === node.children.length - 1 ? node : previous;

      if (target === node) {
        nextChildren.push(child);
        continue;
      }

      nextChildren[nextChildren.length - 1] = mergeMdastAttributes(target, attributes);
      continue;
    }

    nextChildren.push(child);
  }

  return {
    ...node,
    children: nextChildren,
  };
}

function applyMdastAttributeLists(node: AnyMdastNode, ctx: MdastContext): AnyMdastNode {
  const parent = ctx.parent(node);
  let next = stripMdastTrailingAttributeList(node, parent, ctx);
  next = applyMdastInlineAttributeLists(next);
  next = applyMdastStandaloneAttributeLists(next);
  return next;
}

function stripHastTrailingAttributeList(
  node: AnyHastNode,
  parent: AnyHastNode | undefined,
  ctx: HastContext,
): AnyHastNode {
  if (!node.children || !HAST_TEXT_CONTAINER_TARGETS.has(node.tagName ?? '')) {
    return node;
  }

  const lastChild = node.children.at(-1);
  if (!lastChild || lastChild.type !== 'text') return node;

  const parsed = parseSuffixAttributeList(lastChild.value ?? '');
  if (!parsed) return node;

  const appliesToContainer =
    node.tagName === 'p' &&
    parent?.children &&
    ctx.indexOf(node) === parent.children.length - 1 &&
    HAST_CONTAINER_ATTRIBUTE_TARGETS.has(parent.tagName ?? '') &&
    parsed.separator?.includes('\n');

  if (parsed.separator === null && node.children.length < 2) {
    return node;
  }

  let nextChildren = [
    ...node.children.slice(0, -1),
    {
      ...lastChild,
      value: parsed.text,
    },
  ];
  if (parsed.text.length === 0) {
    nextChildren = nextChildren.slice(0, -1);
  }

  if (appliesToContainer && parent) {
    ctx.setProperty(parent, 'properties', mergeProperties(parent.properties, parsed.attributes));
    return {
      ...node,
      children: nextChildren,
    };
  }

  return mergeHastAttributes(
    {
      ...node,
      children: nextChildren,
    },
    parsed.attributes,
  );
}

function applyHastInlineAttributeLists(node: AnyHastNode): AnyHastNode {
  if (!node.children || node.children.length < 2) return node;

  const nextChildren: AnyHastNode[] = [];

  for (const child of node.children) {
    if (child.type === 'text') {
      const previous = nextChildren.at(-1);
      const parsed = !/^\s/.test(child.value ?? '') ? parsePrefixAttributeList(child.value ?? '') : null;

      if (
        parsed &&
        previous?.type === 'element' &&
        typeof previous.tagName === 'string' &&
        HAST_INLINE_ATTRIBUTE_TARGETS.has(previous.tagName)
      ) {
        nextChildren[nextChildren.length - 1] = mergeHastAttributes(previous, parsed.attributes);

        if (parsed.text.length > 0) {
          nextChildren.push({
            ...child,
            value: parsed.text,
          });
        }

        continue;
      }
    }

    nextChildren.push(child);
  }

  return {
    ...node,
    children: nextChildren,
  };
}

function applyHastStandaloneAttributeLists(node: AnyHastNode): AnyHastNode {
  if (!node.children || node.children.length < 2) return node;

  const nextChildren: AnyHastNode[] = [];

  for (const [index, child] of node.children.entries()) {
    const previous = nextChildren.at(-1);
    const onlyChild = child.children?.length === 1 ? child.children[0] : undefined;
    const attributes =
      child.type === 'element' && child.tagName === 'p' ? parseAttributeList(getTextValue(onlyChild)) : null;

    if (
      attributes &&
      ((HAST_CONTAINER_ATTRIBUTE_TARGETS.has(node.tagName ?? '') && index === node.children.length - 1) ||
        previous?.type === 'element')
    ) {
      const target =
        HAST_CONTAINER_ATTRIBUTE_TARGETS.has(node.tagName ?? '') && index === node.children.length - 1
          ? node
          : previous?.type === 'element'
            ? previous
            : null;
      if (!target) {
        nextChildren.push(child);
        continue;
      }

      if (target === node) {
        return mergeHastAttributes(
          {
            ...node,
            children: nextChildren,
          },
          attributes,
        );
      }

      nextChildren[nextChildren.length - 1] = mergeHastAttributes(target, attributes);
      continue;
    }

    nextChildren.push(child);
  }

  return {
    ...node,
    children: nextChildren,
  };
}

function applyHastAttributeLists(node: AnyHastNode, ctx: HastContext): AnyHastNode {
  const parent = ctx.parent(node);
  let next = stripHastTrailingAttributeList(node, parent, ctx);
  next = applyHastInlineAttributeLists(next);
  next = applyHastStandaloneAttributeLists(next);
  return next;
}

export const satteriRemarkAttributeLists = defineMdastPlugin({
  name: 'shinlog-remark-attribute-lists',
  blockquote(node, ctx) {
    return applyMdastAttributeLists(node as AnyMdastNode, ctx as MdastContext) as MdastNode;
  },
  delete(node, ctx) {
    return applyMdastAttributeLists(node as AnyMdastNode, ctx as MdastContext) as MdastNode;
  },
  emphasis(node, ctx) {
    return applyMdastAttributeLists(node as AnyMdastNode, ctx as MdastContext) as MdastNode;
  },
  heading(node, ctx) {
    return applyMdastAttributeLists(node as AnyMdastNode, ctx as MdastContext) as MdastNode;
  },
  link(node, ctx) {
    return applyMdastAttributeLists(node as AnyMdastNode, ctx as MdastContext) as MdastNode;
  },
  list(node, ctx) {
    return applyMdastAttributeLists(node as AnyMdastNode, ctx as MdastContext) as MdastNode;
  },
  listItem(node, ctx) {
    return applyMdastAttributeLists(node as AnyMdastNode, ctx as MdastContext) as MdastNode;
  },
  paragraph(node, ctx) {
    return applyMdastAttributeLists(node as AnyMdastNode, ctx as MdastContext) as MdastNode;
  },
  strong(node, ctx) {
    return applyMdastAttributeLists(node as AnyMdastNode, ctx as MdastContext) as MdastNode;
  },
  tableCell(node, ctx) {
    return applyMdastAttributeLists(node as AnyMdastNode, ctx as MdastContext) as MdastNode;
  },
});

export const satteriRehypeAttributeLists = defineHastPlugin({
  name: 'shinlog-rehype-attribute-lists',
  element: {
    filter: [],
    visit(node, ctx) {
      return applyHastAttributeLists(node as AnyHastNode, ctx as unknown as HastContext) as HastNode;
    },
  },
});
