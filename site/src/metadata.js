import { googleAnalyticsUA } from '../package.json';
import cssnano from '../../packages/cssnano/package.json';
import meta from '../../metadata.toml';

const pkg = {
  ...cssnano,
  twitter: 'cssnano_',
  googleAnalyticsUA,
};

export default {
  pkg,
  modules: meta,
  favicons: [
    {
      rel: 'icon',
      type: 'image/png',
      href: '/favicon.png',
    },
    {
      rel: 'icon',
      type: 'image/svg',
      href: '/favicon.svg',
    },
  ],
};
