export type { HastNode, HastVisitorContext, MdastNode } from 'satteri';

export type AnyMdastNode = {
  attributes?: Record<string, string | null | undefined> | null;
  children?: AnyMdastNode[];
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
  name?: string;
  position?: {
    start?: {
      column?: number;
      line?: number;
    };
  };
  type: string;
  value?: string;
};

export type AnyHastNode = {
  children?: AnyHastNode[];
  properties?: Record<string, unknown>;
  tagName?: string;
  type?: string;
  value?: string;
};

export type Attributes = Record<string, unknown> & {
  className?: string[];
  id?: string;
};

export type MdastContext = {
  indexOf(node: unknown): number | undefined;
  parent(node: unknown): AnyMdastNode | undefined;
  setProperty(node: unknown, key: string, value: unknown): void;
};

export type HastContext = {
  fileURL: URL | undefined;
  indexOf(node: unknown): number | undefined;
  parent(node: unknown): AnyHastNode | undefined;
  setProperty(node: unknown, key: string, value: unknown): void;
  textContent(node: unknown): string;
};
