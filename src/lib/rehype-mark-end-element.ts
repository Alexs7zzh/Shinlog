type HastNode = {
  type?: string;
  tagName?: string;
  value?: string;
  children?: HastNode[];
  properties?: Record<string, unknown>;
};

function isElement(node: HastNode | undefined): node is HastNode & { properties: Record<string, unknown> } {
  return Boolean(node && node.type === 'element');
}

function getClassNames(node: HastNode): string[] {
  const className = node.properties?.className;

  if (Array.isArray(className)) {
    return className.filter((value): value is string => typeof value === 'string');
  }

  if (typeof className === 'string') {
    return className.split(/\s+/).filter(Boolean);
  }

  return [];
}

function hasClass(node: HastNode, className: string): boolean {
  return getClassNames(node).includes(className);
}

function markEndElement(node: HastNode, className: string): void {
  const classNames = getClassNames(node);

  if (!classNames.includes(className)) {
    node.properties = {
      ...node.properties,
      className: [...classNames, className],
    };
  }
}

function isIgnorable(node: HastNode | undefined): boolean {
  if (!node) return true;

  if (node.type === 'text') {
    return typeof node.value !== 'string' || node.value.trim().length === 0;
  }

  return isElement(node) && node.tagName === 'section' && hasClass(node, 'footnotes');
}

export default function rehypeMarkEndElement(): any {
  return (tree: HastNode) => {
    if (!Array.isArray(tree.children)) return;

    for (let index = tree.children.length - 1; index >= 0; index -= 1) {
      const node = tree.children[index];

      if (isIgnorable(node) || !isElement(node)) {
        continue;
      }

      markEndElement(node, 'end-mark');
      return;
    }
  };
}
