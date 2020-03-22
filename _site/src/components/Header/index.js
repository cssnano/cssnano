import * as React from 'react';
import { Link } from 'react-router';
import SVG from 'react-svg-inline';

import data from '../../metadata';

import logo from './logo-alt.svg';
import styles from './index.css';

const Header = () => (
  <header className={styles.header}>
    <nav className={styles.nav}>
      <div className={styles.navPart1}>
        <Link className={[styles.link, styles.logo].join(' ')} to="/">
          <SVG svg={logo} title="cssnano" />
        </Link>
        <Link className={styles.link} to="/guides/">
          Guides
        </Link>
        <Link className={styles.link} to="/community/">
          Community
        </Link>
        <Link className={styles.link} to="/support-us/">
          Support Us
        </Link>
        <Link className={styles.link} to="/blog/">
          Blog
        </Link>
        <Link className={styles.link} to="/playground/">
          Playground
        </Link>
        <a
          href={`https://github.com/${data.pkg.repository}`}
          className={styles.link}
        >
          {'GitHub'}
        </a>
      </div>
    </nav>
  </header>
);

export default Header;
