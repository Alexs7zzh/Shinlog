import type { APIRoute } from 'astro';

import { AGENT_MARKDOWN_CONTENT_TYPE } from '../lib/agent-response';
import { getAgentInterludesResponse } from '../lib/agent-interludes';

export const GET: APIRoute = () => {
  return getAgentInterludesResponse(AGENT_MARKDOWN_CONTENT_TYPE);
};
