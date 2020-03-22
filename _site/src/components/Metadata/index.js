export default ({ title, url, description, twitter }) => [
  { property: 'og:type', content: 'article' },
  { property: 'og:title', content: title },
  { property: 'og:url', content: url ? `https://cssnano.co${url}` : null },
  { property: 'og:description', content: description },
  { name: 'twitter:card', content: 'summary' },
  { name: 'twitter:title', content: title },
  { name: 'twitter:creator', content: `@${twitter}` },
  { name: 'twitter:description', content: description },
  { name: 'description', content: description },
];
