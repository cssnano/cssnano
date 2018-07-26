import * as React from 'react';

import styles from './index.css';

const Content = ({children}) => (
    <div className={ styles.content }>
        {children}
    </div>
);

export default Content;
