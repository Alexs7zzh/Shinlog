import type { APIRoute } from 'astro';

import { AGENT_MARKDOWN_CONTENT_TYPE } from '../lib/agent-response';
import { getAgentPostResponse, getRootAgentPostStaticPaths } from '../lib/agent-post';

export const getStaticPaths = getRootAgentPostStaticPaths;

export const GET: APIRoute = ({ props }) => {
  return getAgentPostResponse(props.url, AGENT_MARKDOWN_CONTENT_TYPE);
};
