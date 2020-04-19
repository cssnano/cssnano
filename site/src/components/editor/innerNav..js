import React from 'react';
import className from 'classnames';
import styles from './editor.module.css';

export default function InnerNav({ ...props }) {
  return (
    <nav
      className={className('navbar navbar--dark', styles.playgroundInnerNav)}
    >
      <div className="navbar__inner">
        <div className="navbar__items">
          <button
            onClick={props.toggleTheme}
            className={className('button button--primary', styles.headbtn)}
          >
            Toggle theme
          </button>
          <button
            onClick={props.runHandler}
            className={className('button button--primary', styles.headbtn)}
          >
            Run
          </button>
          <button
            onClick={props.format}
            className={className('button button--primary', styles.headbtn)}
          >
            Format
          </button>
        </div>
      </div>
    </nav>
  );
}
