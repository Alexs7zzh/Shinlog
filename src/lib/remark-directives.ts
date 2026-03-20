type DirectiveNode = {
  type: string;
  name?: string;
  attributes?: Record<string, string | null | undefined> | null;
  position?: {
    start?: {
      line?: number;
      column?: number;
    };
  };
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
  children?: DirectiveNode[];
};

const DIRECTIVE_RENDERERS: Partial<Record<DirectiveNode['type'], Record<string, string>>> = {
  containerDirective: {
    aside: 'aside',
  },
  textDirective: {
    span: 'span',
  },
};
const SAFE_ATTRIBUTE_NAMES = [/^lang$/, /^data-[A-Za-z0-9_:-]+$/, /^aria-[A-Za-z0-9_:-]+$/];

function isSafeAttributeName(name: string): boolean {
  return SAFE_ATTRIBUTE_NAMES.some((pattern) => pattern.test(name));
}

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

function getRenderedTagName(node: DirectiveNode): string | null {
  if (!node.name) return null;
  return DIRECTIVE_RENDERERS[node.type]?.[node.name] ?? null;
}

function getDirectiveProperties(
  name: string,
  attributes: Record<string, string | null | undefined> | null | undefined,
): Record<string, unknown> {
  return {
    ...getSafeProperties(attributes),
    dataDirective: name,
  };
}

function getQuoteDirectiveProperties(
  attributes: Record<string, string | null | undefined> | null | undefined,
): Record<string, unknown> {
  return {
    dataDirective: 'quote',
    dataDirectiveProperties: JSON.stringify(getSafeProperties(attributes)),
  };
}

function getPositionLabel(node: DirectiveNode): string {
  const line = node.position?.start?.line;
  const column = node.position?.start?.column;
  if (line == null || column == null) return 'unknown position';
  return `${line}:${column}`;
}

function visit(node: DirectiveNode): void {
  const renderedTagName = getRenderedTagName(node);
  if (renderedTagName) {
    node.data ??= {};
    node.data.hName = renderedTagName;
    node.data.hProperties = getSafeProperties(node.attributes);
  } else if (node.type === 'containerDirective' && node.name === 'quote') {
    node.data ??= {};
    node.data.hName = 'div';
    node.data.hProperties = getQuoteDirectiveProperties(node.attributes);
  } else if (node.type === 'leafDirective' && node.name === 'attribution') {
    node.data ??= {};
    node.data.hName = 'div';
    node.data.hProperties = getDirectiveProperties('attribution', node.attributes);
  } else if (
    (node.type === 'containerDirective' || node.type === 'leafDirective' || node.type === 'textDirective') &&
    node.name === 'aside'
  ) {
    throw new Error(`Invalid aside directive at ${getPositionLabel(node)}. Use :::aside{...} as a block directive.`);
  } else if (
    (node.type === 'containerDirective' || node.type === 'leafDirective' || node.type === 'textDirective') &&
    node.name === 'span'
  ) {
    throw new Error(`Invalid span directive at ${getPositionLabel(node)}. Use :span[...] as an inline directive.`);
  } else if (
    (node.type === 'containerDirective' || node.type === 'leafDirective' || node.type === 'textDirective') &&
    node.name === 'quote'
  ) {
    throw new Error(`Invalid quote directive at ${getPositionLabel(node)}. Use :::quote{...} as a block directive.`);
  } else if (
    (node.type === 'containerDirective' || node.type === 'leafDirective' || node.type === 'textDirective') &&
    node.name === 'attribution'
  ) {
    throw new Error(
      `Invalid attribution directive at ${getPositionLabel(node)}. Use ::attribution[...] inside :::quote.`,
    );
  }

  if (!node.children) return;

  for (const child of node.children) {
    visit(child);
  }
}

export default function remarkDirectives(): any {
  return function transformer(tree: DirectiveNode) {
    visit(tree);
  };
}
