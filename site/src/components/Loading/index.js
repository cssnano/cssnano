import * as React from 'react';
import Head from 'react-helmet';
import TopBarProgressIndicator from 'react-topbar-progress-indicator';

import styles from './index.css';

TopBarProgressIndicator.config({
    barColors: {
        0: "#40b97b",
        "1.0": "#40b97b",
    },
    shadowBlur: 0,
});

const Loading = () => (
    <div>
        <Head
            title={ "Loading..." }
        />
        <TopBarProgressIndicator />
        <div className={ styles.loader }>
            <div className={ styles.spinner } />
        </div>
    </div>
);

export default Loading;
