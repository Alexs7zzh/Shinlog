type Node = {
  type: string;
  value?: string;
  children?: Node[];
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
};

type Attributes = Record<string, unknown> & {
  className?: string[];
  id?: string;
};

const TOKEN =
  /\s*(?:\.([A-Za-z0-9_-]+)|#([A-Za-z0-9_-]+)|([A-Za-z_:][A-Za-z0-9_:-]*)(?:=(?:"([^"]*)"|'([^']*)'|([^\s"'=}{]+)))?)/y;

const INLINE_ATTRIBUTE_TARGETS = new Set([
  'delete',
  'emphasis',
  'image',
  'imageReference',
  'inlineCode',
  'link',
  'linkReference',
  'strong',
]);

const CONTAINER_ATTRIBUTE_TARGETS = new Set(['blockquote', 'listItem']);
const TEXT_CONTAINER_TARGETS = new Set(['heading', 'paragraph']);
const SAFE_ATTRIBUTE_NAMES = [/^lang$/, /^data-[A-Za-z0-9_:-]+$/, /^aria-[A-Za-z0-9_:-]+$/];

function isSafeAttributeName(name: string): boolean {
  return SAFE_ATTRIBUTE_NAMES.some((pattern) => pattern.test(name));
}

function parseAttributeList(value: string): Attributes | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

  const inner = trimmed.slice(1, -1).trim();
  if (inner.length === 0) return null;

  const attributes: Attributes = {};
  let index = 0;

  while (index < inner.length) {
    TOKEN.lastIndex = index;
    const match = TOKEN.exec(inner);
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

    index = TOKEN.lastIndex;
  }

  return attributes;
}

function getClassNames(properties: Record<string, unknown> | undefined): string[] {
  const className = properties?.className;
  if (Array.isArray(className)) {
    return className.filter((value): value is string => typeof value === 'string');
  }

  if (typeof className === 'string') {
    return className.split(/\s+/).filter(Boolean);
  }

  return [];
}

function mergeAttributes(node: Node, attributes: Attributes): void {
  node.data ??= {};
  node.data.hProperties ??= {};

  const nextProperties = { ...node.data.hProperties };
  const existingClasses = getClassNames(node.data.hProperties);
  const nextClasses = [...existingClasses];

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

  node.data.hProperties = nextProperties;
}

function getTextValue(node: Node | undefined): string {
  return node?.type === 'text' ? node.value ?? '' : '';
}

function getExactAttributeList(node: Node | undefined): Attributes | null {
  if (!node) return null;

  if (node.type === 'text') {
    return parseAttributeList(node.value ?? '');
  }

  if (node.type === 'mdxTextExpression') {
    return parseAttributeList(`{${node.value ?? ''}}`);
  }

  return null;
}

function parseSuffixAttributeList(
  value: string,
): { text: string; attributes: Attributes; separator: string | null } | null {
  const directMatch = value.match(/^(\{[^{}]+\})$/s);
  if (directMatch) {
    const attributes = parseAttributeList(directMatch[1]);
    if (!attributes) return null;

    return {
      text: '',
      attributes,
      separator: null,
    };
  }

  const match = value.match(/^(.*?)(\s+)(\{[^{}]+\})$/s);
  if (!match) return null;

  const attributes = parseAttributeList(match[3]);
  if (!attributes) return null;

  return {
    text: match[1],
    attributes,
    separator: match[2],
  };
}

function parsePrefixAttributeList(value: string): { text: string; attributes: Attributes } | null {
  const match = value.match(/^(\{[^{}]+\})(.*)$/s);
  if (!match) return null;

  const attributes = parseAttributeList(match[1]);
  if (!attributes) return null;

  return {
    text: match[2],
    attributes,
  };
}

function getInlineAttributes(node: Node): { text: string | null; attributes: Attributes } | null {
  if (node.type === 'text') {
    const value = node.value ?? '';
    if (/^\s/.test(value)) return null;
    return parsePrefixAttributeList(value);
  }

  if (node.type === 'mdxTextExpression') {
    const value = node.value ?? '';
    const attributes = parseAttributeList(`{${value}}`);
    if (!attributes) return null;

    return {
      text: null,
      attributes,
    };
  }

  return null;
}

function stripTrailingAttributeList(node: Node, parent: Node | undefined): void {
  if (!TEXT_CONTAINER_TARGETS.has(node.type) || !node.children || node.children.length === 0) {
    return;
  }

  const lastChild = node.children.at(-1);
  if (!lastChild) return;

  let parsed = lastChild.type === 'text' ? parseSuffixAttributeList(lastChild.value ?? '') : null;

  if (!parsed && lastChild.type === 'mdxTextExpression') {
    const attributes = getExactAttributeList(lastChild);
    if (!attributes) return;

    const previousChild = node.children.at(-2);
    const previousText = getTextValue(previousChild);
    const separatorMatch = previousText.match(/(\s+)$/s);
    const separator = separatorMatch?.[1] ?? null;

    if (node.children.length >= 2 && separator == null) {
      return;
    }

    parsed = {
      text: previousText.slice(0, previousText.length - (separator?.length ?? 0)),
      attributes,
      separator,
    };

    if (previousChild?.type === 'text') {
      previousChild.value = parsed.text;
      if (parsed.text.length === 0) {
        node.children.splice(node.children.length - 2, 1);
      }
    }

    node.children = node.children.slice(0, -1);
  }

  if (!parsed) return;

  const appliesToContainer =
    node.type === 'paragraph' &&
    parent?.children?.at(-1) === node &&
    parent.type !== undefined &&
    CONTAINER_ATTRIBUTE_TARGETS.has(parent.type) &&
    parsed.separator?.includes('\n');

  if (parsed.separator === null && node.children.length < 2) {
    return;
  }

  if (lastChild.type === 'text') {
    lastChild.value = parsed.text;
    if (parsed.text.length === 0) {
      node.children = node.children.slice(0, -1);
    }
  }

  mergeAttributes(appliesToContainer ? parent : node, parsed.attributes);
}

function applyInlineAttributeLists(node: Node): void {
  if (!node.children || node.children.length < 2) return;

  const nextChildren: Node[] = [];

  for (const child of node.children) {
    const parsed = getInlineAttributes(child);
    if (parsed) {
      const previous = nextChildren.at(-1);

      if (previous && INLINE_ATTRIBUTE_TARGETS.has(previous.type)) {
        mergeAttributes(previous, parsed.attributes);

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

  node.children = nextChildren;
}

function applyStandaloneAttributeLists(node: Node): void {
  if (!node.children || node.children.length < 2) return;

  const nextChildren: Node[] = [];

  for (const [index, child] of node.children.entries()) {
    const previous = nextChildren.at(-1);
    const onlyChild = child.children?.length === 1 ? child.children[0] : undefined;
    const attributes = child.type === 'paragraph' ? getExactAttributeList(onlyChild) : null;

    if (attributes && previous) {
      const target =
        CONTAINER_ATTRIBUTE_TARGETS.has(node.type) && index === node.children.length - 1 ? node : previous;
      mergeAttributes(target, attributes);
      continue;
    }

    nextChildren.push(child);
  }

  node.children = nextChildren;
}

function visit(node: Node, parent?: Node): void {
  if (!node.children) return;

  for (const child of node.children) {
    visit(child, node);
  }

  stripTrailingAttributeList(node, parent);
  applyInlineAttributeLists(node);
  applyStandaloneAttributeLists(node);
}

export default function remarkAttributeLists() {
  return function transformer(tree: Node) {
    visit(tree);
  };
}
