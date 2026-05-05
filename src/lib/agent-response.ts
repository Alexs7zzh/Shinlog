export const AGENT_MARKDOWN_CONTENT_TYPE = 'text/markdown; charset=utf-8';
export const AGENT_TEXT_CONTENT_TYPE = 'text/plain; charset=utf-8';

export function isAgentTextRequest(contentType: string): boolean {
  return contentType.startsWith('text/plain');
}

export async function createAgentResponse(
  contentType: string,
  renderers: {
    markdown: () => Promise<string>;
    text: () => Promise<string>;
  },
): Promise<Response> {
  const body = isAgentTextRequest(contentType) ? await renderers.text() : await renderers.markdown();

  return new Response(body, {
    headers: {
      'Content-Type': contentType,
    },
  });
}

export function createAgentTextError(message: string, status: number): Response {
  return new Response(`${message.trimEnd()}\n`, {
    status,
    headers: {
      'Content-Type': AGENT_TEXT_CONTENT_TYPE,
    },
  });
}

export function joinAgentSections(sections: Array<string | null | undefined>): string {
  return `${sections.map((section) => section?.trim()).filter(Boolean).join('\n\n')}\n`;
}
