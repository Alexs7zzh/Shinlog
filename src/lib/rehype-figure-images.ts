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

function getTitle(node: HastNode): string | null {
  const title = node.properties?.title;
  return typeof title === 'string' && title.length > 0 ? title : null;
}

function removeTitle(node: HastNode): void {
  if (!node.properties || typeof node.properties.title !== 'string') return;
  delete node.properties.title;
}

function createTextNode(value: string): HastNode {
  return {
    type: 'text',
    value,
  };
}

function createFigcaptionNode(value: string): HastNode {
  return {
    type: 'element',
    tagName: 'figcaption',
    properties: {},
    children: [createTextNode(value)],
  };
}

function isStandaloneImageParagraph(node: HastNode): node is HastNode & { children: HastNode[] } {
  return isElement(node, 'p') && Array.isArray(node.children) && node.children.length === 1 && isElement(node.children[0], 'img');
}

function visit(node: HastNode): void {
  if (!node.children) return;

  node.children = node.children.map((child) => {
    visit(child);

    if (!isStandaloneImageParagraph(child)) {
      return child;
    }

    const image = child.children[0];
    const title = getTitle(image);
    removeTitle(image);

    return {
      type: 'element',
      tagName: 'figure',
      properties: {},
      children: title ? [image, createFigcaptionNode(title)] : [image],
    };
  });
}

export default function rehypeFigureImages(): any {
  return (tree: HastNode) => {
    visit(tree);
  };
}
