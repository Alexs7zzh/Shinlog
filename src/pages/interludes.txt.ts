import type { APIRoute } from 'astro';

import { AGENT_TEXT_CONTENT_TYPE } from '../lib/agent-response';
import { getAgentInterludesResponse } from '../lib/agent-interludes';

export const GET: APIRoute = () => {
  return getAgentInterludesResponse(AGENT_TEXT_CONTENT_TYPE);
};
