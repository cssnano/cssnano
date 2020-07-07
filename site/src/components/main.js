import React from 'react';
import styles from './main.module.css';

export default ({ ...props }) => {
  return <main className={styles.main}>{props.children}</main>;
};
