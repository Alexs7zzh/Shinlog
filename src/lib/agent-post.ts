import { getCollection } from 'astro:content';

import { SITE_TITLE } from '../consts';
import { renderAgentMarkdown } from './agent-markdown';
import { createAgentResponse, createAgentTextError, joinAgentSections } from './agent-response';
import { renderAgentText } from './agent-text';
import { formatHtmlDate } from './date';
import {
  getPostAlternativeLinks,
  getPostLang,
  getPostMarkdownUrl,
  getPostSlug,
  getPostTextUrl,
  getPostUrl,
  usesDefaultPostPath,
  validatePostLocales,
  type PostSource,
} from './post-paths';

function getMetadata(post: PostSource, posts: PostSource[]): string[] {
  const slug = getPostSlug(post);
  const lang = getPostLang(post);
  const alternativeLinks = getPostAlternativeLinks(posts, slug);

  return [
    `Site: ${SITE_TITLE}`,
    `Published: ${formatHtmlDate(post.data.date)}`,
    `Language: ${lang}`,
    `HTML: ${getPostUrl(post)}`,
    `Markdown: ${getPostMarkdownUrl(post)}`,
    `Text: ${getPostTextUrl(post)}`,
    ...alternativeLinks.map((link) => `Alternate (${link.lang}): ${link.url}`),
  ];
}

export async function getAgentPostMarkdown(post: PostSource, posts: PostSource[]): Promise<string> {
  const description = post.data.description ? await renderAgentMarkdown(post.data.description) : undefined;
  const body = await renderAgentMarkdown(post.body ?? '');

  return joinAgentSections([`# ${post.data.title}`, getMetadata(post, posts).join('\n'), description, body]);
}

export async function getAgentPostText(post: PostSource, posts: PostSource[]): Promise<string> {
  const description = post.data.description ? await renderAgentText(post.data.description) : undefined;
  const body = await renderAgentText(post.body ?? '');

  return joinAgentSections([post.data.title, getMetadata(post, posts).join('\n'), description, body]);
}

export async function getRootAgentPostStaticPaths() {
  const posts = await getCollection('posts');

  validatePostLocales(posts);

  return posts
    .filter((post) => usesDefaultPostPath(getPostLang(post)))
    .map((post) => ({
      params: { slug: getPostSlug(post) },
      props: { url: getPostUrl(post) },
    }));
}

export async function getLocalizedAgentPostStaticPaths() {
  const posts = await getCollection('posts');

  validatePostLocales(posts);

  return posts
    .filter((post) => !usesDefaultPostPath(getPostLang(post)))
    .map((post) => ({
      params: { slug: getPostSlug(post), lang: getPostLang(post) },
      props: { url: getPostUrl(post) },
    }));
}

export async function getAgentPostResponse(url: unknown, contentType: string): Promise<Response> {
  if (typeof url !== 'string') {
    return createAgentTextError('Missing post URL.', 500);
  }

  const posts = await getCollection('posts');

  validatePostLocales(posts);

  const post = posts.find((candidate) => getPostUrl(candidate) === url);
  if (!post) {
    return createAgentTextError('Post not found.', 404);
  }

  return createAgentResponse(contentType, {
    markdown: () => getAgentPostMarkdown(post, posts),
    text: () => getAgentPostText(post, posts),
  });
}
