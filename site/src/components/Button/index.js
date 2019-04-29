import * as React from 'react';
import { Link } from 'react-router';
import cx from 'classnames';

import styles from './index.css';

const Button = ({ to, className, secondary, dark, big, ...otherProps }) => (
  <Link
    to={to}
    {...otherProps}
    className={cx({
      [className]: className,
      [styles.button]: true,
      [styles.secondary]: secondary,
      [styles.dark]: dark,
      [styles.big]: big,
    })}
  />
);

export default Button;
