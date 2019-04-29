import * as React from 'react';
import Head from 'react-helmet';

import Hero from '../../components/Hero';

class PageError extends React.Component {
  static defaultProps = {
    error: 404,
    errorText: 'Page not found',
  };

  render() {
    const { error, errorText } = this.props;

    return (
      <div>
        <Head title={`${errorText} (${error})`} />
        <Hero>
          <p>
            {errorText} ({error})
          </p>
          <p>That’s all she wrote...</p>
        </Hero>
      </div>
    );
  }
}

export default PageError;
