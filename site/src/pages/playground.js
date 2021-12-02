import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Editor from '@monaco-editor/react';
import { FiSave, FiPlay } from 'react-icons/fi';
import { MdFormatAlignLeft } from 'react-icons/md';
import { AiOutlineBgColors } from 'react-icons/ai';
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
  "preset" : "lite", // online playground can use only the "lite" preset
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
          playgroundConfig.preset[0] === 'advance'
            ? 'cssnano-preset-advance'
            : playgroundConfig.preset[0] === 'default'
            ? 'cssnano-preset-default'
            : 'cssnano-preset-lite',
          playgroundConfig.preset.length > 1 ? playgroundConfig.preset[1] : {},
        ];
      }
      [
        playgroundConfig.preset === 'advance'
          ? 'cssnano-preset-advance'
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
              <AiOutlineBgColors /> Toggle theme
            </button>
            <button
              onClick={runOptimizer}
              className={className('button button--primary', styles.headbtn)}
            >
              <FiPlay /> Run
            </button>
            <button
              onClick={format}
              className={className('button button--primary', styles.headbtn)}
            >
              <MdFormatAlignLeft /> Format
            </button>
            <button
              onClick={saveState}
              className={className('button button--primary', styles.headbtn)}
            >
              <FiSave /> Save
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
