type HastNode = {
  type?: string;
  tagName?: string;
  value?: string;
  children?: HastNode[];
  properties?: Record<string, unknown>;
};

function isElement(node: HastNode | undefined, tagName?: string): boolean {
  if (!node || node.type !== 'element') return false;
  return tagName ? node.tagName === tagName : true;
}

function isWhitespaceText(node: HastNode | undefined): boolean {
  return node?.type === 'text' && typeof node.value === 'string' && node.value.trim().length === 0;
}

function getDirectiveName(node: HastNode | undefined): string | null {
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

function getLastMeaningfulChildIndex(children: HastNode[]): number {
  for (let index = children.length - 1; index >= 0; index -= 1) {
    if (!isWhitespaceText(children[index])) {
      return index;
    }
  }

  return -1;
}

function createFigure(node: HastNode, children: HastNode[]): HastNode {
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

function createBlockquote(children: HastNode[]): HastNode {
  return {
    type: 'element',
    tagName: 'blockquote',
    properties: {},
    children,
  };
}

function createFigcaption(node: HastNode): HastNode {
  return {
    type: 'element',
    tagName: 'figcaption',
    properties: {},
    children: node.children ?? [],
  };
}

function normalizeQuoteFigure(node: HastNode): HastNode {
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

  node.properties = {
    ...node.properties,
    className: [...new Set([...figureClassNames, ...blockquoteClassNames])],
  };

  const nextBlockquoteProperties = { ...firstChild.properties };
  delete nextBlockquoteProperties.className;
  firstChild.properties = nextBlockquoteProperties;

  return node;
}

function transformQuote(node: HastNode): HastNode {
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

  return normalizeQuoteFigure(
    createFigure(node, [createBlockquote(quoteChildren), createFigcaption(attribution)]),
  );
}

function visit(node: HastNode): void {
  if (!node.children) return;

  for (const child of node.children) {
    visit(child);
  }

  node.children = node.children.map((child) =>
    isElement(child) && getDirectiveName(child) === 'quote' ? transformQuote(child) : child,
  );
}

export default function rehypeQuoteDirectives(): any {
  return (tree: HastNode) => {
    visit(tree);
  };
}
