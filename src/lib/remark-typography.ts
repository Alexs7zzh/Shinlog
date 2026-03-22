type MdastNode = {
  type: string;
  value?: string;
  children?: MdastNode[];
};

const CJK_DASH_PUNCTUATION = new Set(['「', '」', '『', '』', '（', '）', '《', '》', '〈', '〉', '【', '】', '“', '”']);

function isCjkDashContextChar(char: string | undefined): boolean {
  return typeof char === 'string' && (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(char) || CJK_DASH_PUNCTUATION.has(char));
}

function normalizeDoubleEmDash(value: string): string {
  return normalizeCjkEmDash(value.replace(/\u2014{2}/g, '\u2E3A'));
}

function normalizeCjkEmDash(value: string): string {
  const chars = Array.from(value);

  for (let index = 0; index < chars.length; index += 1) {
    if (chars[index] !== '\u2014') {
      continue;
    }

    let leftIndex = index - 1;
    while (leftIndex >= 0 && chars[leftIndex] === ' ') {
      leftIndex -= 1;
    }

    let rightIndex = index + 1;
    while (rightIndex < chars.length && chars[rightIndex] === ' ') {
      rightIndex += 1;
    }

    if (isCjkDashContextChar(chars[leftIndex]) && isCjkDashContextChar(chars[rightIndex])) {
      chars[index] = '\u2E3A';
    }
  }

  return chars.join('');
}

function splitWrappedText(value: string): MdastNode[] {
  const normalized = normalizeDoubleEmDash(value);
  return normalized.length > 0 ? [{ type: 'text', value: normalized }] : [];
}

function transformHtmlBlock(value: string): string {
  return normalizeCjkEmDash(
    value
    .replace(/(^|[^-])---(?=[^-]|$)/gm, '$1\u2014')
    .replace(/(^|\s)--(?=\s|$)/gm, '$1\u2013')
    .replace(/(^|[^-\s])--(?=[^-\s]|$)/gm, '$1\u2013')
    .replace(/\u2014{2}/g, '\u2E3A')
    .replace(/\.{2,}/g, '…')
    .replace(/([?!])…/g, '$1..'),
  );
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
