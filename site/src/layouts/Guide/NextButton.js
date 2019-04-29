import * as React from 'react';

import Button from '../../components/Button';

import styles from './index.css';

const NextButton = ({ index, pages }) => {
  const guides = pages || [];
  const nextGuide = index && guides[index];

  if (!nextGuide) {
    return null;
  }
  return (
    <Button to={`/guides/${nextGuide.id}`} className={styles.button}>
      <div className={styles.next}>
        <p>Up next</p>
        <p>{nextGuide.title}</p>
      </div>
    </Button>
  );
};

export default NextButton;
