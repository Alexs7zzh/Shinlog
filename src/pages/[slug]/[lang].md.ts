import type { APIRoute } from 'astro';

import { AGENT_MARKDOWN_CONTENT_TYPE } from '../../lib/agent-response';
import { getAgentPostResponse, getLocalizedAgentPostStaticPaths } from '../../lib/agent-post';

export const getStaticPaths = getLocalizedAgentPostStaticPaths;

export const GET: APIRoute = ({ props }) => {
  return getAgentPostResponse(props.url, AGENT_MARKDOWN_CONTENT_TYPE);
};
