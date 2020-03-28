import React from 'react';
import classnames from 'classnames';
import Layout from '@theme/Layout';
import CodeBlock from '@theme/CodeBlock';
import TabItem from '@theme/TabItem';
import Tabs from '@theme/Tabs';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Main from '../components/main';
import styles from './styles.module.css';

const cssExampleInput = `/* normalize selectors */
h1::before, h1:before {
    /* reduce shorthand even further */
    margin: 10px 20px 10px 20px;
    /* reduce color values */
    color: #ff0000;
    /* remove duplicated properties */
    font-weight: 400;
    font-weight: 400;
    /* reduce position values */
    background-position: bottom right;
    /* normalize wrapping quotes */
    quotes: '«' "»";
    /* reduce gradient parameters */
    background: linear-gradient(to bottom, #ffe500 0%, #ffe500 50%, #121 50%, #121 100%);
    /* replace initial values */
    min-width: initial;
}
/* correct invalid placement */
@charset "utf-8";`;

const cssExampleOutput = `@charset "utf-8";h1:before{margin:10px 20px;color:red;font-weight:400;background-position:100% 100%;quotes:"«" "»";background:linear-gradient(180deg,#ffe500,#ffe500 50%,#121 0,#121);min-width:0}`;

const features = [
  {
    title: <>PostCSS Based</>,
    imageUrl: 'img/postcss.svg',
    description: <>CSSNANO is built upon postcss plugins and environments</>,
  },
  {
    title: <>30+ Plugins</>,
    imageUrl: 'img/undraw_settings.svg',
    description: <>CSSNANO has more than 30 plugins for optimizing your css</>,
  },
  {
    title: <>Configurable</>,
    imageUrl: 'img/undraw_config.svg',
    description: (
      <>
        CSSNANO supports custom configs using presets which controls the level
        of optimization
      </>
    ),
  },
];

const minifyTableData = [
  {
    property: 'Original (gzip)',
    value: '325 B',
  },
  {
    property: 'Minified (gzip)',
    value: '177 B',
  },
  {
    property: 'Difference',
    value: '148 B',
  },
  {
    property: 'Percent',
    value: '54.46%',
  },
];

function Feature({ imageUrl, title, description }) {
  const imgUrl = useBaseUrl(imageUrl);
  return (
    <div className={classnames('col col--4', styles.feature)}>
      {imgUrl && (
        <div className="text--center">
          <img className={styles.featureImage} src={imgUrl} alt={title} />
        </div>
      )}
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function Home() {
  const context = useDocusaurusContext();
  const { siteConfig = {} } = context;
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="CSSNANO - postcss based css optimizer"
    >
      <header className={classnames('hero hero--primary', styles.heroBanner)}>
        <div className="container">
          <img className={styles.logoImg} src={useBaseUrl('img/logo.svg')} />

          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <p className={styles.small_p}>
            Plug in cssnano into your build step for modern CSS compression.
          </p>
          <div className={styles.buttons}>
            <Link
              className={classnames(
                'button button--outline button--secondary button--lg',
                styles.getStartedBtn
              )}
              to={useBaseUrl('docs/introduction')}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>
      <Main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              <h1 className={styles.h1}>What it does ?</h1>
              <p>
                cssnano takes your nicely formatted CSS and runs it through many
                focused optimisations, to ensure that the final result is as
                small as possible for a production environment.
              </p>
            </div>
            <div className="row">
              <div className={styles.centerSnippet}>
                <Tabs
                  className={'mini'}
                  defaultValue="Input"
                  values={[
                    {
                      label: <>Input</>,
                      value: 'Input',
                    },
                    {
                      label: <>Output</>,
                      value: 'Output',
                    },
                  ]}
                >
                  <TabItem value="Input">
                    <CodeBlock className="language-css">
                      {cssExampleInput}
                    </CodeBlock>
                  </TabItem>
                  <TabItem value="Output">
                    <CodeBlock className="language-css">
                      {cssExampleOutput}
                    </CodeBlock>
                  </TabItem>
                </Tabs>
              </div>
            </div>
            <div className="row" style={{ marginTop: '2em' }}>
              <div className="col-xs-9 col-md-9 col-sm-12">
                <div className="box">
                  <p>
                    The semantics of this CSS have been kept the same, but the
                    extraneous whitespace has been removed, the identifiers
                    compressed, and unnecessary definitions purged from the
                    stylesheet.
                    <br />
                  </p>
                  <p>
                    This gives you a much smaller CSS for production use. But
                    don’t just take our word for it; why not try out css-size, a
                    module especially created to measure CSS size before & after
                    minification.
                  </p>
                </div>
              </div>
              <div className="col-xs-3 col-md-3 col-sm-12">
                <div className="box">
                  <table
                    className="col-xs-12 col-md-12 col-sm-12"
                    style={{ margin: 'auto' }}
                  >
                    <tbody>
                      {minifyTableData.map(({ property, value }, i) => (
                        <tr
                          key={i}
                          style={{ width: '100%', 'max-width': '100%' }}
                        >
                          <td>{property}</td>
                          <td>{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>
      </Main>

      <Main>
        {features && features.length && (
          <section className={styles.features}>
            <div className="container">
              <div className="row">
                <h1 className={styles.h1}>Features</h1>
                {features.map((props, idx) => (
                  <Feature key={idx} {...props} />
                ))}
              </div>
            </div>
          </section>
        )}
      </Main>
      <Main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              <h1 className={styles.h1}>Technology</h1>
              <div className={styles.flex}>
                <p className={styles.flex1}>
                  cssnano is powered by PostCSS, a tool for transforming styles
                  with JavaScript. Specifically, its plugin architecture allows
                  us to compose cssnano out of small modules with limited
                  responsibilities. It also allows you to easily insert cssnano
                  into your build step, along with other processors that can
                  lint your CSS for errors, or transpile future syntax.
                </p>
                <span>
                  {' '}
                  <img style={{}} src={useBaseUrl('img/postcss.svg')} />
                </span>
              </div>
            </div>
          </div>
        </section>
      </Main>
    </Layout>
  );
}

export default Home;
