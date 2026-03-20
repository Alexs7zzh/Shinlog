type MdastNode = {
  type: string;
  value?: string;
  children?: MdastNode[];
};

function normalizeDoubleEmDash(value: string): string {
  return value.replace(/\u2014{2}/g, '\u2E3A');
}

function splitWrappedText(value: string): MdastNode[] {
  const normalized = normalizeDoubleEmDash(value);
  return normalized.length > 0 ? [{ type: 'text', value: normalized }] : [];
}

function transformHtmlBlock(value: string): string {
  return value
    .replace(/(^|[^-])---(?=[^-]|$)/gm, '$1\u2014')
    .replace(/(^|\s)--(?=\s|$)/gm, '$1\u2013')
    .replace(/(^|[^-\s])--(?=[^-\s]|$)/gm, '$1\u2013')
    .replace(/\u2014{2}/g, '\u2E3A')
    .replace(/\.{2,}/g, '…')
    .replace(/([?!])…/g, '$1..');
}

function visit(node: MdastNode): void {
  if (node.type === 'html' && typeof node.value === 'string') {
    node.value = transformHtmlBlock(node.value);
  }

  if (!node.children) {
    return;
  }

  const nextChildren: MdastNode[] = [];

  for (const child of node.children) {
    if (child.type === 'text' && typeof child.value === 'string') {
      nextChildren.push(...splitWrappedText(child.value));
      continue;
    }

    visit(child);
    nextChildren.push(child);
  }

  node.children = nextChildren;
}

export default function remarkTypography(): any {
  return (tree: MdastNode) => {
    visit(tree);
  };
}
