type Node = {
  type: string;
  value?: string;
  children?: Node[];
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

const TEXT_CONTAINER_TARGETS = new Set(['heading', 'paragraph']);
const SAFE_ATTRIBUTE_NAMES = [/^lang$/, /^data-[A-Za-z0-9_:-]+$/, /^aria-[A-Za-z0-9_:-]+$/];

function isSafeAttributeName(name: string): boolean {
  return SAFE_ATTRIBUTE_NAMES.some((pattern) => pattern.test(name));
}

function isAttributeList(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return false;

  const inner = trimmed.slice(1, -1).trim();
  if (inner.length === 0) return false;

  let index = 0;

  while (index < inner.length) {
    TOKEN.lastIndex = index;
    const match = TOKEN.exec(inner);
    if (!match) return false;

    const [, className, id, name, doubleQuoted, singleQuoted, bareValue] = match;

    if (!className && !id && name) {
      if (!isSafeAttributeName(name)) return false;
      void (doubleQuoted ?? singleQuoted ?? bareValue);
    }

    index = TOKEN.lastIndex;
  }

  return true;
}

function isExactAttributeList(node: Node | undefined): boolean {
  return node?.type === 'text' && isAttributeList(node.value ?? '');
}

function parseSuffixAttributeList(value: string): { text: string; separator: string | null } | null {
  const directMatch = value.match(/^(\{[^{}]+\})$/s);
  if (directMatch) {
    if (!isAttributeList(directMatch[1])) return null;

    return {
      text: '',
      separator: null,
    };
  }

  const match = value.match(/^(.*?)(\s+)(\{[^{}]+\})$/s);
  if (!match) return null;

  if (!isAttributeList(match[3])) return null;

  return {
    text: match[1],
    separator: match[2],
  };
}

function parsePrefixAttributeList(value: string): { text: string } | null {
  const match = value.match(/^(\{[^{}]+\})(.*)$/s);
  if (!match) return null;

  if (!isAttributeList(match[1])) return null;

  return {
    text: match[2],
  };
}

function getInlineAttributeList(node: Node): { text: string } | null {
  if (node.type === 'text') {
    const value = node.value ?? '';
    if (/^\s/.test(value)) return null;
    return parsePrefixAttributeList(value);
  }

  return null;
}

function stripTrailingAttributeList(node: Node): void {
  if (!TEXT_CONTAINER_TARGETS.has(node.type) || !node.children || node.children.length === 0) {
    return;
  }

  const lastChild = node.children.at(-1);
  if (!lastChild) return;

  const parsed = lastChild.type === 'text' ? parseSuffixAttributeList(lastChild.value ?? '') : null;
  if (!parsed) return;

  if (parsed.separator === null && node.children.length < 2) {
    return;
  }

  if (lastChild.type === 'text') {
    lastChild.value = parsed.text;
    if (parsed.text.length === 0) {
      node.children = node.children.slice(0, -1);
    }
  }
}

function applyInlineAttributeLists(node: Node): void {
  if (!node.children || node.children.length < 2) return;

  const nextChildren: Node[] = [];

  for (const child of node.children) {
    const parsed = getInlineAttributeList(child);
    if (parsed) {
      const previous = nextChildren.at(-1);

      if (previous && INLINE_ATTRIBUTE_TARGETS.has(previous.type)) {
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

function applyStandaloneAttributeLists(node: Node): void {
  if (!node.children || node.children.length < 2) return;

  const nextChildren: Node[] = [];

  for (const [index, child] of node.children.entries()) {
    const previous = nextChildren.at(-1);
    const onlyChild = child.children?.length === 1 ? child.children[0] : undefined;
    const isStandaloneAttributeList = child.type === 'paragraph' && isExactAttributeList(onlyChild);

    if (isStandaloneAttributeList && previous && index > 0) {
      continue;
    }

    nextChildren.push(child);
  }

  node.children = nextChildren;
}

function visit(node: Node): void {
  if (!node.children) return;

  for (const child of node.children) {
    visit(child);
  }

  stripTrailingAttributeList(node);
  applyInlineAttributeLists(node);
  applyStandaloneAttributeLists(node);
}

export function applyAgentMarkdownAttributes(tree: Node): void {
  visit(tree);
}
