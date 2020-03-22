import * as React from 'react';
import Head from 'react-helmet';
import {
  textRenderer,
  BodyRenderer,
} from '@phenomic/preset-react-app/lib/client';

import Loading from '../../components/Loading';
import metadata from '../../components/Metadata';
import data from '../../metadata';

import styles from './index.css';

const Page = (props) => {
  const {
    isLoading,
    title,
    url,
    metaTitle,
    header,
    body,
    children,
    footer,
  } = props;
  const description = body && textRenderer(body).slice(0, 150) + '…';
  const { pkg } = data;

  const meta = metadata({
    title: metaTitle || title,
    description: description,
    url: url,
    twitter: pkg.twitter,
  });

  return (
    <div className={styles.page}>
      <Head title={`${metaTitle || title} - cssnano`} meta={meta} />
      <div className={styles.wrapper + ' ' + styles.pageContent}>
        <h1 className={styles.title}>{title}</h1>
        {header}
        <div className={styles.body}>
          {isLoading ? (
            <Loading />
          ) : (
            body && <BodyRenderer>{body}</BodyRenderer>
          )}
        </div>
        {children}
        {footer}
      </div>
    </div>
  );
};

export default Page;
