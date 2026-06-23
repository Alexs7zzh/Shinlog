import { defineHastPlugin, defineMdastPlugin } from 'satteri';

import type { AnyHastNode, HastNode } from './markdown-types.ts';

const CJK_DASH_PUNCTUATION = new Set(['「', '」', '『', '』', '（', '）', '《', '》', '〈', '〉', '【', '】', '“', '”']);
const CJK_TYPE1 = '、。，？！；：';
const CJK_TYPE2 = '《》「」『』（）”“';
const HAST_SKIP_TYPOGRAPHY_TAGS = new Set(['code', 'pre', 'script', 'style']);

function isCjkScript(char: string | undefined): boolean {
  return typeof char === 'string' && /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(char);
}

function isType1(char: string | undefined): boolean {
  return typeof char === 'string' && CJK_TYPE1.includes(char);
}

function isType2(char: string | undefined): boolean {
  return typeof char === 'string' && CJK_TYPE2.includes(char);
}

function isCjkDashContextChar(char: string | undefined): boolean {
  return isCjkScript(char) || isType2(char) || (typeof char === 'string' && CJK_DASH_PUNCTUATION.has(char));
}

function isHalfwidthCandidate(char: string | undefined): boolean {
  return isType1(char) || isType2(char);
}

function normalizeCjkDashRun(value: string): string {
  const chars = Array.from(value);

  for (let index = 0; index < chars.length; index += 1) {
    if (chars[index] !== '\u2014' && chars[index] !== '\u2013') {
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

function normalizeDoubleEmDash(value: string): string {
  return normalizeCjkDashRun(value.replace(/\u2014{2}/g, '\u2E3A'));
}

function transformHtmlBlock(value: string): string {
  return normalizeCjkDashRun(
    value
      .replace(/(^|[^-])---(?=[^-]|$)/gm, '$1\u2014')
      .replace(/(^|\s)--(?=\s|$)/gm, '$1\u2013')
      .replace(/(^|[^-\s])--(?=[^-\s]|$)/gm, '$1\u2013')
      .replace(/\u2014{2}/g, '\u2E3A')
      .replace(/\.{2,}/g, '…')
      .replace(/([?!])…/g, '$1..'),
  );
}

function createTextNode(value: string): AnyHastNode | null {
  return value.length > 0
    ? {
        type: 'text',
        value,
      }
    : null;
}

function createHalfwidthNode(value: string): AnyHastNode {
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

function splitHastTextNode(value: string): AnyHastNode[] {
  const chars = Array.from(normalizeCjkDashRun(value));
  const nodes: AnyHastNode[] = [];
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

function applyHastTypography(node: AnyHastNode): AnyHastNode | undefined {
  if (!Array.isArray(node.children) || HAST_SKIP_TYPOGRAPHY_TAGS.has(node.tagName ?? '')) return undefined;

  const nextChildren = node.children.flatMap((child) =>
    child.type === 'text' && typeof child.value === 'string' ? splitHastTextNode(child.value) : [child],
  );

  return {
    ...node,
    children: nextChildren,
  };
}

export const markdownMdastTypography = defineMdastPlugin({
  name: 'shinlog-mdast-typography',
  html(node, ctx) {
    ctx.setProperty(node, 'value', transformHtmlBlock(node.value));
  },
  text(node, ctx) {
    ctx.setProperty(node, 'value', normalizeDoubleEmDash(node.value));
  },
});

export const markdownHastTypography = defineHastPlugin({
  name: 'shinlog-hast-typography',
  element: {
    filter: [],
    visit(node) {
      return applyHastTypography(node as AnyHastNode) as HastNode | undefined;
    },
  },
});
