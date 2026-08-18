import { getCollection } from 'astro:content';
import { absoluteUrl, url } from '../lib/site.js';

export async function GET() {
  const docs = await getCollection('docs');
  const posts = await getCollection('blog');
  const paths = [
    '/',
    '/docs/what-are-optimisations/',
    '/docs/community/',
    '/docs/contributing/',
    '/docs/changelog/',
    '/playground/',
    '/blog/',
    ...docs
      .filter(({ id }) => !id.includes('optimisations/optimisation-page') && !['community', 'what-are-optimisations'].includes(id))
      .map(({ id }) => `/docs/${id}/`),
    ...posts.map(({ data, id }) => `/${data.permalink ?? `blog/${id}/`}`),
  ];
  const body = paths.map((path) => `<url><loc>${absoluteUrl(url(path))}</loc><priority>0.5</priority><changefreq>monthly</changefreq></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="utf-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
}
