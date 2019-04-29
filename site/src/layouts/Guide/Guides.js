import * as React from 'react';
import { Link } from 'react-router';

import styles from './index.css';

function formatGuide({ id, title }, index) {
  return (
    <li key={`guide__${index}`}>
      <Link
        onlyActiveOnIndex
        to={`/guides/${id}`}
        className={styles.link}
        activeClassName={styles.active}
      >
        {title}
      </Link>
    </li>
  );
}

const Guides = ({ pages }) => (
  <ul className={styles.guides}>{pages && pages.map(formatGuide)}</ul>
);

export default Guides;
