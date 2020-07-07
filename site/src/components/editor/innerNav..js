import React from 'react';
import className from 'classnames';
import { FiSave, FiPlay } from 'react-icons/fi';
import { MdFormatAlignLeft } from 'react-icons/md';
import { AiOutlineBgColors } from 'react-icons/ai';
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
            <AiOutlineBgColors /> Toggle theme
          </button>
          <button
            onClick={props.runHandler}
            className={className('button button--primary', styles.headbtn)}
          >
            <FiPlay /> Run
          </button>
          <button
            onClick={props.format}
            className={className('button button--primary', styles.headbtn)}
          >
            <MdFormatAlignLeft /> Format
          </button>
          <button
            onClick={props.save}
            className={className('button button--primary', styles.headbtn)}
          >
            <FiSave /> Save
          </button>
        </div>
      </div>
    </nav>
  );
}
