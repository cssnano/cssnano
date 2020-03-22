import * as React from 'react';

import styles from './index.css';

const Container = ({ children }) => (
  <div className={styles.container}>{children}</div>
);

export default Container;
