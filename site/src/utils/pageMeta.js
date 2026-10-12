export const siteName = 'cssnano';
export const defaultDescription = 'cssnano - postcss based css optimizer';

/**
 * @param {object} page
 * @param {string} page.title page title, without the site name
 * @param {boolean} [page.home] the home page title is the site name itself
 * @param {string} [page.description] summary for search results and link previews
 * @param {'website' | 'article'} [page.type] Open Graph type
 * @returns {{ pageTitle: string, description: string, type: 'website' | 'article' }}
 */
export function pageMeta({
  title,
  home = false,
  description = defaultDescription,
  type = 'website',
}) {
  return {
    pageTitle: home ? title : `${title} · ${siteName}`,
    description,
    type,
  };
}
