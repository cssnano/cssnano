import * as React from 'react';
import Head from 'react-helmet';

import data from '../../metadata';

const DefaultHeadMeta = (props) => (
  <div hidden>
    <Head
      meta={[
        { property: 'og:site_name', content: 'cssnano' },
        { name: 'twitter:site', content: `@${data.pkg.twitter}` },
        ...(props.meta ? props.meta : []),
      ]}
      script={[
        {
          src:
            'https://cdn.polyfill.io/v2/polyfill.min.js' +
            '?features=es6&flags=gated',
        },
        ...(props.scripts ? props.scripts : []),
      ]}
      link={data.favicons}
    />
    {/* meta viewport safari/chrome/edge */}
    <Head
      meta={[
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
      ]}
    />
    <style>{'@-ms-viewport { width: device-width; }'}</style>
  </div>
);

export default DefaultHeadMeta;
