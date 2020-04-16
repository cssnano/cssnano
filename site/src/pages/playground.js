import React, { useState } from 'react';
import Layout from '@theme/Layout';

import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

import useBaseUrl from '@docusaurus/useBaseUrl';
import Input from '../components/playground/input';
import Output from '../components/playground/output';
import Panel from '../components/playground/panel';
import { AppContext } from '../context/appContext';
import pluginsData from '../components/data/plugins.json';
import styles from './styles.module.css';

const initialConfig = {
  preset: 'cssnano-preset-default',
  plugins: pluginsData['cssnano-preset-default'],
};

// eslint-disable-next-line no-console
console.log('[CSSNANO Playground]: INITIAL CONFIG', initialConfig);

export default () => {
  const context = useDocusaurusContext();
  const { siteConfig = {} } = context;
  const [config, setConfig] = useState(initialConfig);
  return (
    <AppContext.Provider value={{ config, setConfig }}>
      <Layout title={`${siteConfig.title}`} description="CSSNANO - Playground">
        <div className="row">
          <div className="col col--3">
            <Panel />
          </div>
          <div className="col col--5">
            <Input />
          </div>
          <div className="col col--4">
            <Output />
          </div>
        </div>
      </Layout>
    </AppContext.Provider>
  );
};
