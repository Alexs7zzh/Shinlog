type HastNode = {
  type?: string;
  tagName?: string;
  value?: string;
  children?: HastNode[];
  properties?: Record<string, unknown>;
};

type Attributes = Record<string, unknown> & {
  className?: string[];
  id?: string;
};

const TOKEN =
  /\s*(?:\.([A-Za-z0-9_-]+)|#([A-Za-z0-9_-]+)|([A-Za-z_:][A-Za-z0-9_:-]*)(?:=(?:"([^"]*)"|'([^']*)'|([^\s"'=}{]+)))?)/y;
const INLINE_ATTRIBUTE_TARGETS = new Set(['a', 'code', 'del', 'em', 'img', 'span', 'strong']);
const CONTAINER_ATTRIBUTE_TARGETS = new Set(['blockquote', 'li']);
const TEXT_CONTAINER_TARGETS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p']);
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

function mergeAttributes(node: HastNode, attributes: Attributes): void {
  node.properties ??= {};

  const nextProperties = { ...node.properties };
  const existingClasses = getClassNames(node.properties);
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

  node.properties = nextProperties;
}

function getTextValue(node: HastNode | undefined): string {
  return node?.type === 'text' ? node.value ?? '' : '';
}

function stripTrailingAttributeList(node: HastNode, parent: HastNode | undefined): void {
  if (!node.children || !TEXT_CONTAINER_TARGETS.has(node.tagName ?? '')) {
    return;
  }

  const lastChild = node.children.at(-1);
  if (!lastChild || lastChild.type !== 'text') return;

  const parsed = parseSuffixAttributeList(lastChild.value ?? '');
  if (!parsed) return;

  const appliesToContainer =
    node.tagName === 'p' &&
    parent?.children?.at(-1) === node &&
    CONTAINER_ATTRIBUTE_TARGETS.has(parent.tagName ?? '') &&
    parsed.separator?.includes('\n');

  if (parsed.separator === null && node.children.length < 2) {
    return;
  }

  lastChild.value = parsed.text;
  if (parsed.text.length === 0) {
    node.children = node.children.slice(0, -1);
  }

  mergeAttributes(appliesToContainer ? parent : node, parsed.attributes);
}

function applyInlineAttributeLists(node: HastNode): void {
  if (!node.children || node.children.length < 2) return;

  const nextChildren: HastNode[] = [];

  for (const child of node.children) {
    if (child.type === 'text') {
      const previous = nextChildren.at(-1);
      const parsed = !/^\s/.test(child.value ?? '') ? parsePrefixAttributeList(child.value ?? '') : null;

      if (
        parsed &&
        previous?.type === 'element' &&
        typeof previous.tagName === 'string' &&
        INLINE_ATTRIBUTE_TARGETS.has(previous.tagName)
      ) {
        mergeAttributes(previous, parsed.attributes);

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

  node.children = nextChildren;
}

function applyStandaloneAttributeLists(node: HastNode): void {
  if (!node.children || node.children.length < 2) return;

  const nextChildren: HastNode[] = [];

  for (const [index, child] of node.children.entries()) {
    const previous = nextChildren.at(-1);
    const onlyChild = child.children?.length === 1 ? child.children[0] : undefined;
    const attributes =
      child.type === 'element' && child.tagName === 'p' ? parseAttributeList(getTextValue(onlyChild)) : null;

    if (
      attributes &&
      ((CONTAINER_ATTRIBUTE_TARGETS.has(node.tagName ?? '') && index === node.children.length - 1) ||
        previous?.type === 'element')
    ) {
      const target =
        CONTAINER_ATTRIBUTE_TARGETS.has(node.tagName ?? '') && index === node.children.length - 1
          ? node
          : previous?.type === 'element'
            ? previous
            : null;
      if (!target) {
        nextChildren.push(child);
        continue;
      }

      mergeAttributes(target, attributes);
      continue;
    }

    nextChildren.push(child);
  }

  node.children = nextChildren;
}

function visit(node: HastNode, parent?: HastNode): void {
  if (!node.children) return;

  for (const child of node.children) {
    if (child.type === 'element') {
      visit(child, node);
    }
  }

  stripTrailingAttributeList(node, parent);
  applyInlineAttributeLists(node);
  applyStandaloneAttributeLists(node);
}

export default function rehypeAttributeLists(): any {
  return (tree: HastNode) => {
    visit(tree);
  };
}
