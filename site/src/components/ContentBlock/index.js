import * as React from 'react';
import cx from 'classnames';

import styles from './index.css';

const ContentBlock = ({className, children, ...otherProps}) => (
    <div
        { ...otherProps }
        className={ cx({
            [className]: className,
            [styles.outer]: true,
        }) }
    >
        <div className={styles.inner}>
            {children}
        </div>
    </div>
);

export default ContentBlock;
