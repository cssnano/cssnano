import React from 'react';
import styles from './RingSpinner.module.css';

/* eslint-disable import/prefer-default-export */
export function RingSpinner() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.circle}></div>
    </div>
  );
}
