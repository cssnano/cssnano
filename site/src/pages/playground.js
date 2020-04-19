import React, { useState } from 'react';
import Layout from '@theme/Layout';
import prettier from 'prettier/standalone';
import cssParser from 'prettier/parser-postcss';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import className from 'classnames';
import { RingSpinner as Loader } from 'react-spinners-kit';
import { AppContext } from '../context/appContext';
import MainEditor from '../components/editor/main';
import OutputEditor from '../components/editor/output';
import defaultCssnanoConfig from '../components/editor/snippets/config';
import unicode from '../helper/unicode';
import { getUrlState } from '../helper/url';
import ConfigEditor from '../components/editor/config';
import InnerNav from '../components/editor/innerNav.';
import runner from '../components/editor/postcss_runner';
import editorStyles from '../components/editor/editor.module.css';
import styles from './styles.module.css';

export default () => {
  const storedState = JSON.parse(
    window.localStorage.getItem('cssnano_editor_state') || null
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

  const context = useDocusaurusContext();
  const { siteConfig = {} } = context;
  const [theme, setTheme] = useState('dark');
  const [editorLoading, setEditorLoading] = useState(false);
  const [output, setOutput] = useState('/* your optimized output here */');
  const [input, setInput] = useState(intializedState.input);
  const [config, setConfig] = useState(intializedState.config);

  function toggleTheme() {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }

  function handleConfigChange(e, value) {
    setConfig(value);
  }

  function handleOnInput(e, value) {
    setInput(value);
  }

  function format() {
    const formattedInput = prettier.format(input, {
      parser: 'css',
      plugins: [cssParser],
    });
    setInput(formattedInput);
  }

  function saveState() {
    const serializedState = JSON.stringify({
      input: input,
      config: config,
    });

    if (window && window.localStorage) {
      window.localStorage.setItem('cssnano_editor_state', serializedState);
    }
    window.location.hash = unicode.encodeToBase64(serializedState);
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
        setOutput(res.css);
      })
      .catch((err) => {
        setOutput(err);
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
            : 'cssnano-preset-default',
          playgroundConfig.preset.length > 1 ? playgroundConfig.preset[1] : {},
        ];
      }
      [
        playgroundConfig.preset === 'advance'
          ? 'cssnano-preset-advance'
          : 'cssnano-preset-default',
        {},
      ];
    } else {
      // eslint-disable-next-line no-warning-comments
      // TODO
    }

    return ['cssnano-preset-default', {}];
  }

  return (
    <AppContext.Provider value={{ config, setConfig }}>
      <Layout title={`${siteConfig.title}`} description="CSSNANO - Playground">
        <InnerNav
          toggleTheme={toggleTheme}
          runHandler={runOptimizer}
          format={format}
          save={saveState}
        />
        <div
          className={editorStyles.panelLoaderPlaceholder}
          style={{ display: editorLoading ? 'block' : 'none' }}
        >
          <div className={editorStyles.panelLoaderHolder}>
            <Loader />
          </div>
        </div>
        <div className="row" style={{ margin: '0' }}>
          <div className={className('col col--4', styles.editorCol)}>
            <MainEditor
              theme={theme}
              input={input}
              handleOnChange={handleOnInput}
            />
          </div>
          <div className={className('col col--4', styles.editorCol)}>
            <ConfigEditor
              theme={theme}
              config={config}
              handleOnChange={handleConfigChange}
            />
          </div>
          <div className={className('col col--4', styles.editorCol)}>
            <OutputEditor theme={theme} output={output} />
          </div>
        </div>
      </Layout>
    </AppContext.Provider>
  );
};
