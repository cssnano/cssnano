import React, { useState, useEffect, useRef } from 'react';
import Layout from '@theme/Layout';
import { EditorState, EditorView, basicSetup } from '@codemirror/basic-setup';
import { css } from '@codemirror/lang-css';
import prettier from 'prettier/standalone';
import cssParser from 'prettier/parser-postcss';
import className from 'classnames';
import { CssSyntaxError } from 'postcss';
import { RingSpinner as Loader } from '../components/editor/RingSpinner.js';
import unicode from '../helper/unicode.js';
import { getUrlState } from '../helper/url.js';
import runner from '../components/editor/postcss_runner.js';
import CarbonAds from '../components/carbonAds.js';
import styles from './styles.module.css';

export default () => {
  const storedState = JSON.parse(
    (typeof window !== 'undefined' &&
      window.localStorage.getItem('cssnano_editor_state')) ||
      null
  );
  const urlState = getUrlState();
  const initializedState = urlState ||
    storedState || {
      input: '/* write your css below */',
      config: 'cssnano-preset-default',
    };

  const [editorLoading, setEditorLoading] = useState(false);
  const [config, setConfig] = useState(initializedState.config);
  const [error, setError] = useState('');

  const inputArea = useRef(null);
  const outputArea = useRef(null);

  const outputView = useRef(null);
  const inputView = useRef(null);

  function handleError(err) {
    switch (err.constructor) {
      case CssSyntaxError:
        setError(`CssSyntaxError: ${err.reason} (${err.line}:${err.column})`);
        break;
      case SyntaxError:
        setError(err.message.split('\n').shift());
        break;
      default:
        setError('Unknown error. See browser console for details.');
        console.error(err);
    }
  }

  function resetError() {
    setError('');
  }

  function format() {
    try {
      resetError();
      const formattedInput = prettier.format(
        inputView.current.state.doc.sliceString(
          0,
          inputView.current.state.doc.length
        ),
        {
          parser: 'css',
          plugins: [cssParser],
        }
      );

      const transaction = inputView.current.state.update({
        changes: {
          from: 0,
          to: inputView.current.state.doc.length,
          insert: formattedInput,
        },
      });
      inputView.current.dispatch(transaction);
    } catch (err) {
      handleError(err);
    }
  }

  function saveState() {
    const serializedState = JSON.stringify({
      input: inputView.current.state.doc.sliceString(
        0,
        inputView.current.state.doc.length
      ),
      config: config,
    });

    if (typeof window !== 'undefined') {
      if (window.localStorage) {
        window.localStorage.setItem('cssnano_editor_state', serializedState);
      }

      window.location.hash = unicode.encodeToBase64(serializedState);
    }
  }

  async function runOptimizer() {
    // show the loading. editor panel loader not each editor's loader
    setEditorLoading(true);
    const input = inputView.current.state.doc.sliceString(
      0,
      inputView.current.state.doc.length
    );
    runner(input, [config])
      .then((res) => {
        resetError();
        if (outputView.current) {
          const transaction = outputView.current.state.update({
            changes: {
              from: 0,
              to: outputView.current.state.doc.length,
              insert: res.css,
            },
          });
          outputView.current.dispatch(transaction);
        }
      })
      .catch((err) => {
        handleError(err);
      });

    setEditorLoading(false);
  }

  useEffect(() => {
    inputView.current = new EditorView({
      state: EditorState.create({
        doc: initializedState.input,
        extensions: [basicSetup, css()],
      }),
      parent: inputArea.current,
    });

    outputView.current = new EditorView({
      state: EditorState.create({
        doc: '/* your optimized output here */',
        extensions: [basicSetup, css(), EditorView.editable.of(false)],
      }),
      parent: outputArea.current,
    });
  }, []);

  return (
    /* Icons from https://ant.design/components/icon/ under the MIT license */
    <Layout title="CSSNANO" description="CSSNANO - Playground">
      <CarbonAds customClass="playground_position" />
      <nav
        className={className('navbar navbar--dark', styles.playgroundInnerNav)}
      >
        <div className="navbar__inner">
          <div className="navbar__items">
            <label className="navbar__item" htmlFor="presetSelector">
              Choose a preset
            </label>
            <select
              className="dropdown navbar__item"
              id="presetSelector"
              onChange={(ev) => setConfig(ev.target.value)}
            >
              <option value="cssnano-preset-default">Preset Default</option>
              <option value="cssnano-preset-lite">Preset Lite</option>
              <option value="cssnano-preset-advanced">Preset Advanced</option>
            </select>
            <button
              onClick={runOptimizer}
              className={className('button button--primary', styles.headbtn)}
            >
              <svg
                viewBox="64 64 896 896"
                focusable="false"
                data-icon="play-circle"
                width="1em"
                height="1em"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z"></path>
                <path d="M719.4 499.1l-296.1-215A15.9 15.9 0 00398 297v430c0 13.1 14.8 20.5 25.3 12.9l296.1-215a15.9 15.9 0 000-25.8zm-257.6 134V390.9L628.5 512 461.8 633.1z"></path>
              </svg>{' '}
              Run
            </button>
            <button
              onClick={format}
              className={className('button button--primary', styles.headbtn)}
            >
              <svg
                viewBox="64 64 896 896"
                focusable="false"
                data-icon="align-left"
                width="1em"
                height="1em"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M120 230h496c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8H120c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8zm0 424h496c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8H120c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8zm784 140H120c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8zm0-424H120c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8z"></path>
              </svg>{' '}
              Format
            </button>
            <button
              onClick={saveState}
              className={className('button button--primary', styles.headbtn)}
            >
              <svg
                viewBox="64 64 896 896"
                focusable="false"
                data-icon="save"
                width="1em"
                height="1em"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M893.3 293.3L730.7 130.7c-7.5-7.5-16.7-13-26.7-16V112H144c-17.7 0-32 14.3-32 32v736c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V338.5c0-17-6.7-33.2-18.7-45.2zM384 184h256v104H384V184zm456 656H184V184h136v136c0 17.7 14.3 32 32 32h320c17.7 0 32-14.3 32-32V205.8l136 136V840zM512 442c-79.5 0-144 64.5-144 144s64.5 144 144 144 144-64.5 144-144-64.5-144-144-144zm0 224c-44.2 0-80-35.8-80-80s35.8-80 80-80 80 35.8 80 80-35.8 80-80 80z"></path>
              </svg>{' '}
              Save
            </button>
          </div>
        </div>
      </nav>
      {error && <div className={styles.inputError}>{error}</div>}
      <div
        className={styles.panelLoaderPlaceholder}
        style={{ display: editorLoading ? 'block' : 'none' }}
      >
        <div className={styles.panelLoaderHolder}>
          <Loader />
        </div>
      </div>
      <div className="row" style={{ margin: '0' }}>
        <div
          className={className('col col--6', styles.editorCol)}
          ref={inputArea}
        ></div>
        <div
          className={className('col col--6', styles.editorCol)}
          ref={outputArea}
        ></div>
      </div>
    </Layout>
  );
};
