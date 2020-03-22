import * as React from 'react';
import { BodyRenderer } from '@phenomic/preset-react-app/lib/client';

import Loading from '../../components/Loading';

import styles from './index.css';

const CoverPage = ({ isLoading, header, body, children, footer }) => (
  <div className={styles.page}>
    <div className={styles.wrapper + ' ' + styles.pageContent}>
      {header}
      <div className={styles.body}>
        {isLoading ? <Loading /> : body && <BodyRenderer>{body}</BodyRenderer>}
      </div>
      {children}
      {footer}
    </div>
  </div>
);

export default CoverPage;
