import * as React from 'react';
import ReactGA from 'react-ga';

import data from '../../metadata';

const isProduction = process.env.NODE_ENV === 'production';
const isClient = typeof window !== 'undefined';

class Analytics extends React.Component {
  componentWillMount() {
    if (!isClient || !isProduction) {
      return;
    }
    ReactGA.initialize(data.pkg.googleAnalyticsUA);
    this.logPageview();
  }

  componentWillReceiveProps(props) {
    if (!props.params) {
      return;
    }

    if (props.params.splat !== this.props.params.splat) {
      this.logPageview();
    }
  }

  logPageview() {
    if (!isClient || !isProduction) {
      return;
    }
    ReactGA.pageview(window.location.pathname);
  }

  render() {
    return <div>{this.props.children}</div>;
  }
}

export default Analytics;
