import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Editor from '@monaco-editor/react';
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
  const intializedState = urlState ||
    storedState || {
      input: '/* write your css below */',
      config: `// cssnano config
{
  "preset" : "default",
}
`,
    };
  const [theme, setTheme] = useState('vs-dark');
  const [editorLoading, setEditorLoading] = useState(false);
  const [output, setOutput] = useState('/* your optimized output here */');
  const [input, setInput] = useState(intializedState.input);
  const [config, setConfig] = useState(intializedState.config);
  const [error, setError] = useState('');

  function toggleTheme() {
    setTheme(theme === 'light' ? 'vs-dark' : 'light');
  }

  function handleConfigChange(value) {
    setConfig(value);
  }

  function handleOnInput(value) {
    setInput(value);
  }

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
      const formattedInput = prettier.format(input, {
        parser: 'css',
        plugins: [cssParser],
      });
      setInput(formattedInput);
    } catch (err) {
      handleError(err);
    }
  }

  function saveState() {
    const serializedState = JSON.stringify({
      input: input,
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
    const configToSend = JSON.parse(
      JSON.stringify(config.split('\n').slice(1).join('\n'))
    );

    const resolvedConfig = resolveConfigs(configToSend);
    runner(input, resolvedConfig)
      .then((res) => {
        resetError();
        setOutput(res.css);
      })
      .catch((err) => {
        handleError(err);
      });

    setEditorLoading(false);
  }

  /**
   * it converts the playground specific config to postcss plugins
   * @param {object} playgroundConfig - config from config editor panel
   * @returns {object} postcssConfig
   */
  function resolveConfigs(playgroundConfig) {
    if (typeof playgroundConfig !== 'object') {
      // throw error
    }
    if (
      typeof playgroundConfig.preset !== 'undefined' &&
      typeof playgroundConfig.preset !== 'string'
    ) {
      // throw toaster error
    }

    if (typeof playgroundConfig.plugins === 'undefined') {
      if (Array.isArray(playgroundConfig.preset)) {
        return [
          playgroundConfig.preset[0] === 'advanced'
            ? 'cssnano-preset-advance'
            : playgroundConfig.preset[0] === 'default'
            ? 'cssnano-preset-default'
            : 'cssnano-preset-lite',
          playgroundConfig.preset.length > 1 ? playgroundConfig.preset[1] : {},
        ];
      }
      [
        playgroundConfig.preset === 'advanced'
          ? 'cssnano-preset-advanced'
          : playgroundConfig.preset === 'default'
          ? 'cssnano-preset-default'
          : 'cssnano-preset-lite',
        {},
      ];
    } else {
      // eslint-disable-next-line no-warning-comments
      // TODO
    }

    return ['cssnano-preset-default', {}];
  }

  return (
    /* Icons from https://ant.design/components/icon/ under the MIT license */
    <Layout title="CSSNANO" description="CSSNANO - Playground">
      <CarbonAds customClass="playground_position" />
      <nav
        className={className('navbar navbar--dark', styles.playgroundInnerNav)}
      >
        <div className="navbar__inner">
          <div className="navbar__items">
            <button
              onClick={toggleTheme}
              className={className('button button--primary', styles.headbtn)}
            >
              <svg
                viewBox="64 64 896 896"
                focusable="false"
                data-icon="bg-colors"
                width="1em"
                height="1em"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M766.4 744.3c43.7 0 79.4-36.2 79.4-80.5 0-53.5-79.4-140.8-79.4-140.8S687 610.3 687 663.8c0 44.3 35.7 80.5 79.4 80.5zm-377.1-44.1c7.1 7.1 18.6 7.1 25.6 0l256.1-256c7.1-7.1 7.1-18.6 0-25.6l-256-256c-.6-.6-1.3-1.2-2-1.7l-78.2-78.2a9.11 9.11 0 00-12.8 0l-48 48a9.11 9.11 0 000 12.8l67.2 67.2-207.8 207.9c-7.1 7.1-7.1 18.6 0 25.6l255.9 256zm12.9-448.6l178.9 178.9H223.4l178.8-178.9zM904 816H120c-4.4 0-8 3.6-8 8v80c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-80c0-4.4-3.6-8-8-8z"></path>
              </svg>{' '}
              Toggle theme
            </button>
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
      {error && (
        <div className={styles.inputError} data-theme={theme}>
          {error}
        </div>
      )}
      <div
        className={styles.panelLoaderPlaceholder}
        style={{ display: editorLoading ? 'block' : 'none' }}
      >
        <div className={styles.panelLoaderHolder}>
          <Loader />
        </div>
      </div>
      <div className="row" style={{ margin: '0' }}>
        <div className={className('col col--4', styles.editorCol)}>
          <Editor
            height="50rem"
            theme={theme}
            language={'css'}
            loading={<Loader />}
            value={input}
            onChange={handleOnInput}
            options={{ lineNumbers: 'on' }}
          />
        </div>
        <div className={className('col col--4', styles.editorCol)}>
          <Editor
            height="50rem"
            theme={theme}
            language={'json'}
            loading={<Loader />}
            value={config}
            onChange={handleConfigChange}
            options={{ lineNumbers: 'on' }}
          />
        </div>
        <div className={className('col col--4', styles.editorCol)}>
          <Editor
            height="50rem"
            theme={theme}
            language={'css'}
            loading={<Loader />}
            value={output}
            options={{ lineNumbers: 'on' }}
          />
        </div>
      </div>
    </Layout>
  );
};
