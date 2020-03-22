// eslint-disable-next-line no-unused-vars
import * as React from 'react';
import { createApp, renderApp } from '@phenomic/preset-react-app/lib/client';

import routes from './src/routes';

export default createApp(routes);

if (module.hot) {
  module.hot.accept(() => renderApp(routes));
}
