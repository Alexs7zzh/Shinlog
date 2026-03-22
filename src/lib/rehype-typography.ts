type HastNode = {
  type?: string;
  tagName?: string;
  value?: string;
  children?: HastNode[];
  properties?: Record<string, unknown>;
};

const TYPE1 = '、。，？！；：';
const TYPE2 = '《》「」『』（）”“';
const SKIP_TAG_NAMES = new Set(['code', 'pre', 'script', 'style']);

function isCjkScript(char: string | undefined): boolean {
  return typeof char === 'string' && /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(char);
}

function isType1(char: string | undefined): boolean {
  return typeof char === 'string' && TYPE1.includes(char);
}

function isType2(char: string | undefined): boolean {
  return typeof char === 'string' && TYPE2.includes(char);
}

function isCjkDashContextChar(char: string | undefined): boolean {
  return isCjkScript(char) || isType2(char);
}

function isHalfwidthCandidate(char: string | undefined): boolean {
  return isType1(char) || isType2(char);
}

function createTextNode(value: string): HastNode | null {
  return value.length > 0
    ? {
        type: 'text',
        value,
      }
    : null;
}

function createHalfwidthNode(value: string): HastNode {
  return {
    type: 'element',
    tagName: 'span',
    properties: {
      className: ['halfwidth'],
    },
    children: [
      {
        type: 'text',
        value,
      },
    ],
  };
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

function splitTextNode(value: string): HastNode[] {
  const chars = Array.from(normalizeCjkEmDash(value));
  const nodes: HastNode[] = [];
  let textBuffer = '';

  const flushTextBuffer = () => {
    const textNode = createTextNode(textBuffer);
    if (textNode) {
      nodes.push(textNode);
    }
    textBuffer = '';
  };

  for (let index = 0; index < chars.length; ) {
    const current = chars[index];
    const next = chars[index + 1];

    if (isHalfwidthCandidate(current)) {
      let runEnd = index + 1;
      while (runEnd < chars.length && isHalfwidthCandidate(chars[runEnd])) {
        runEnd += 1;
      }

      if (runEnd - index >= 3) {
        flushTextBuffer();
        nodes.push(createHalfwidthNode(chars.slice(index, runEnd).join('')));
        index = runEnd;
        continue;
      }
    }

    if (isType1(current) && isType2(next)) {
      flushTextBuffer();
      nodes.push(createHalfwidthNode(current));
      index += 1;
      continue;
    }

    if (
      typeof next === 'string' &&
      ((isType2(current) && isType1(next)) || (isType1(current) && isType1(next)) || (isType2(current) && isType2(next)))
    ) {
      flushTextBuffer();
      nodes.push(createHalfwidthNode(`${current}${next}`));
      index += 2;
      continue;
    }

    textBuffer += current;
    index += 1;
  }

  flushTextBuffer();
  return nodes;
}

function visit(node: HastNode): void {
  if (!node.children || SKIP_TAG_NAMES.has(node.tagName ?? '')) {
    return;
  }

  const nextChildren: HastNode[] = [];

  for (const child of node.children) {
    if (child.type === 'text' && typeof child.value === 'string') {
      nextChildren.push(...splitTextNode(child.value));
      continue;
    }

    visit(child);
    nextChildren.push(child);
  }

  node.children = nextChildren;
}

export default function rehypeTypography(): any {
  return (tree: HastNode) => {
    visit(tree);
  };
}
