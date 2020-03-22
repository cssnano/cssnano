import * as React from 'react';
import { Link } from 'react-router';

import data from '../../metadata';

import styles from './index.css';

const Footer = () => (
  <footer className={styles.footer}>
    <p>
      Latest release v{data.pkg.version} &middot;
      <Link to="/changelog/">{' Changelog '}</Link>
      &middot; Distributed under the MIT License.
    </p>
  </footer>
);

export default Footer;
