// The validity gate for value stages: a stage must never turn a declaration
// that a browser ignores into one it accepts, because that changes rendering.
//
//   CHROMIUM_PATH=/usr/bin/chromium-browser node util/valueValidity.js
//
// Runs each value stage alone over the framework corpus, then asks Chromium
// whether `CSS.supports(property, value)` holds before and after each change.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { launchChromium } from './chromium.js';
import { oneStagePlugin, withTargets } from './testHelpers.js';

/**
 * @typedef {object} ValueChange
 * @property {string} prop
 * @property {string} before
 * @property {string} after
 */

/**
 * @param {import('postcss').Root} root
 * @return {import('postcss').Declaration[]}
 */
function declarationsOf(root) {
  /** @type {import('postcss').Declaration[]} */
  const declarations = [];
  root.walkDecls((declaration) => {
    declarations.push(declaration);
  });
  return declarations;
}

/**
 * The declarations whose value a plugin changes. The plugin must keep the
 * declarations it does not remove, so both walks line up.
 *
 * @param {string} css
 * @param {import('postcss').AcceptedPlugin} plugin
 * @return {Promise<ValueChange[]>}
 */
export async function changedValues(css, plugin) {
  const before = declarationsOf(postcss.parse(css)).map(
    (declaration) => declaration.value
  );
  const { root } = await postcss([plugin]).process(css, { from: undefined });
  /** @type {ValueChange[]} */
  const changes = [];
  for (const [index, declaration] of declarationsOf(root).entries()) {
    if (declaration.value !== before[index]) {
      changes.push({
        prop: declaration.prop,
        before: before[index],
        after: declaration.value,
      });
    }
  }
  return changes;
}

/**
 * @param {readonly ValueChange[]} changes
 * @param {(prop: string, value: string) => boolean} supports
 * @return {ValueChange[]} the changes that made an ignored declaration valid
 */
export function invalidBecameValid(changes, supports) {
  return changes.filter(
    ({ prop, before, after }) =>
      !supports(prop, before) && supports(prop, after)
  );
}

// The repository's own browserslist config targets IE 11, which switches off
// the stages that need modern browsers, so the gate pins its targets.
const modernTargets = withTargets('baseline widely available with downstream');

/**
 * Values the frameworks lack. Invalid inputs matter most: a stage must leave
 * them ignored.
 * @type {Record<string, string>}
 */
const syntheticCorpus = {
  'postcss-minify-gradients': [
    'linear-gradient(to top, red, blue)',
    'linear-gradient(to bottom right, red, blue)',
    'linear-gradient(to top left, red, blue)',
    'linear-gradient(to nowhere, red, blue)',
    'linear-gradient(red 0%, blue 100%)',
    'linear-gradient(red 0px, blue 100%)',
    'linear-gradient(0deg, red 0%, blue 100%)',
    'linear-gradient(red, blue 100%)',
    'linear-gradient(red 0%, blue)',
    'linear-gradient(red, blue, 100%)',
    'linear-gradient(rgb(0 0 0 / 50%) 0%, blue 100%)',
    'repeating-linear-gradient(red 0%, blue 10px 100%)',
    '-webkit-linear-gradient(top, red 0%, blue 100%)',
    'radial-gradient(circle at center, red 0%, blue 100%)',
    'radial-gradient(circle at top left, red 0px, blue 100%)',
    'radial-gradient(red 0%, blue 100%)',
    'conic-gradient(from 0deg, red 0deg, blue 360deg)',
    'conic-gradient(red 0%, blue 100%)',
  ]
    .map((value) => `a{background-image:${value}}`)
    .join('\n'),
  'postcss-reduce-initial': [
    ['top', 'initial'],
    ['top', 'auto'],
    ['display', 'initial'],
    ['display', 'inline'],
    ['opacity', 'initial'],
    ['opacity', '1'],
    ['opacity', '1.0'],
    ['color', 'initial'],
    ['margin-left', 'initial'],
    ['margin-left', '0'],
    ['margin-left', '0px'],
    ['flex-direction', 'ROW'],
    ['unknown-property', 'initial'],
  ]
    .map(([prop, value]) => `a{${prop}:${value}}`)
    .join('\n'),
  'postcss-normalize-display-values': [
    'block flow',
    'block flow-root',
    'inline flow',
    'inline flow-root',
    'block flex',
    'inline flex',
    'inline grid',
    'inline table',
    'block flow list-item',
    'list-item block flow',
    'list-item inline flow',
    'list-item block flex',
    'block block',
    'flow flow',
    'block inline',
    'block foo',
    'run-in flow',
    'block ruby',
    'inline ruby',
  ]
    .map((value) => `a{display:${value}}`)
    .join('\n'),
  'postcss-reduce-transforms': [
    'scale(1, 1)',
    'scale(2, 2)',
    'scale(2, 1)',
    'scale(1, 2)',
    'scale(1px, 1px)',
    'scale(1%, 1%)',
    'scale(1deg, 1)',
    'scale3d(1, 1, 2)',
    'scale3d(1, 1px, 2)',
    'translate(10px, 0)',
    'translate(0, 10px)',
    'translate(0, 0)',
    'translate(0deg, 10px)',
    'translate(10px, 0deg)',
    'translate(10px, 0foo)',
    'translate3d(0, 0, 10px)',
    'translate3d(0, 0%, 10px)',
    'translate3d(0deg, 0, 10px)',
    'rotate3d(1, 0, 0, 10deg)',
    'rotate3d(0, 1, 0, 10deg)',
    'rotate3d(1, 0, 0, 10)',
    'rotate3d(1px, 0, 0, 10deg)',
  ]
    .map((value) => `a{transform:${value}}`)
    .join('\n'),
  'postcss-normalize-timing-functions': [
    'cubic-bezier(0.25, 0.1, 0.25, 1)',
    'cubic-bezier(0, 0, 1, 1)',
    'cubic-bezier(0.42, 0, 1, 1)',
    'cubic-bezier(0, 0, 0.58, 1)',
    'cubic-bezier(0.42, 0, 0.58, 1)',
    'cubic-bezier(0.25, 0.1, 0.25)',
    'cubic-bezier(2, 0.1, 0.25, 1)',
    'steps(1, start)',
    'steps(1, end)',
    'steps(1, jump-start)',
    'steps(1)',
    'steps(2, end)',
    'steps(0)',
    'steps(1.5, end)',
    'steps(1, nope)',
  ]
    .map((value) => `a{transition-timing-function:${value}}`)
    .join('\n'),
  'postcss-calc': [
    'calc(1px + 2px)',
    'calc(100% - 10px)',
    'calc(2 * 3px)',
    'calc(1px * 2 + 3px)',
    'calc(1px / 0)',
    'calc(1px + var(--x))',
    'calc(1deg + 1rad)',
    'calc(10px * (1px + 1px))',
  ]
    .map((value) => `a{width:${value}}`)
    .join('\n'),
  'postcss-convert-values': [
    'a{width:96px;transition-duration:500ms;transform:rotate(1grad)}',
    'a{line-height:0px;flex-basis:0%;opacity:1.2}',
    'a{margin:0px 0.0px;font:12px/1.5 serif}',
    '@keyframes k{from{width:0px;opacity:1.2}to{width:0%}}',
    '@property --x{syntax:"<length>";initial-value:0px}',
    '@property --y{syntax:"<length-percentage>";initial-value:0%}',
    '@property --z{syntax:"<length>";initial-value:0%}',
  ].join('\n'),
};

/**
 * @param {string} stage the plugin directory name of a value stage
 * @param {string} frameworks the directory of the framework corpus
 * @param {string} stageDir
 * @param {{evaluate: (expression: string) => Promise<any>}} browser
 * @return {Promise<{checked: number, bad: ValueChange[]}>}
 */
async function checkStage(stage, frameworks, stageDir, browser) {
  const entry = (await import(join(stageDir, stage, 'index.js'))).default;
  const corpus = [
    ...readdirSync(frameworks)
      .toSorted()
      .map((file) => readFileSync(join(frameworks, file), 'utf8')),
    syntheticCorpus[stage] ?? '',
  ];
  /** @type {Map<string, ValueChange>} */
  const unique = new Map();
  for (const css of corpus) {
    for (const change of await changedValues(
      css,
      oneStagePlugin(entry)(modernTargets)
    )) {
      unique.set(JSON.stringify(change), change);
    }
  }
  const changes = [...unique.values()];
  const verdicts = await browser.evaluate(
    `(${(/** @type {ValueChange[]} */ list) =>
      list.map(({ prop, before, after }) => [
        CSS.supports(prop, before),
        CSS.supports(prop, after),
      ])})(${JSON.stringify(changes)})`
  );
  const supported = new Map(
    changes.flatMap((change, index) => [
      [`${change.prop}\0${change.before}`, verdicts[index][0]],
      [`${change.prop}\0${change.after}`, verdicts[index][1]],
    ])
  );
  const bad = invalidBecameValid(changes, (prop, value) =>
    supported.get(`${prop}\0${value}`)
  );
  return { checked: changes.length, bad };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const executablePath = process.env.CHROMIUM_PATH;
  if (!executablePath) {
    console.error('Set CHROMIUM_PATH to a Chromium or Chrome executable.');
    process.exit(2);
  }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const stageDir = join(root, 'packages', 'cssnano', 'src', 'plugins');
  const stages = [
    'postcss-minify-gradients',
    'postcss-reduce-initial',
    'postcss-normalize-display-values',
    'postcss-reduce-transforms',
    'postcss-colormin',
    'postcss-normalize-timing-functions',
    'postcss-calc',
    'postcss-convert-values',
  ];
  const browser = await launchChromium(executablePath);
  let failures = 0;
  try {
    for (const stage of stages) {
      const { checked, bad } = await checkStage(
        stage,
        join(root, 'frameworks'),
        stageDir,
        browser
      );
      for (const change of bad) {
        console.error(`${stage}: ${JSON.stringify(change)}`);
      }
      failures += bad.length;
      console.log(`${stage}: ${checked} changed values checked`);
    }
  } finally {
    await browser.close();
  }
  process.exit(failures === 0 ? 0 : 1);
}
