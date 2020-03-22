import * as React from 'react';
import { Router, Route, browserHistory } from 'react-router';

import App from './layouts/App/Index';
import Home from './layouts/Home';
import Blog from './layouts/Blog';
import Post from './layouts/Post';
import Guide from './layouts/Guide';
import Community from './layouts/Community';
import SupportUs from './layouts/SupportUs';
import Playground from './layouts/Playground';
import Changelog from './layouts/Changelog';
import Optimisations from './layouts/Optimisations';
import Optimisation from './layouts/Optimisation';
import PageError from './layouts/PageError';

export default () => (
  <Router history={browserHistory}>
    <Route component={App}>
      <Route path="/" component={Home} />
      <Route path="/guides" component={Guide} />
      <Route path="/guides/*" component={Guide} />
      <Route path="/community" component={Community} />
      <Route path="/support-us" component={SupportUs} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/*" component={Post} />
      <Route path="/playground" component={Playground} />
      <Route path="/changelog" component={Changelog} />
      <Route path="/optimisations" component={Optimisations} />
      <Route path="/optimisations/*" component={Optimisation} />
      <Route path="/404.html" component={PageError} />
      <Route path="/*" component={PageError} />
    </Route>
  </Router>
);
