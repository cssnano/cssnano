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
import { oneStagePlugin } from './testHelpers.js';

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

/**
 * Values the frameworks lack. Invalid inputs matter most: a stage must leave
 * them ignored.
 * @type {Record<string, string>}
 */
const syntheticCorpus = {
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
};

/**
 * @param {string} stage the plugin directory name of a value stage
 * @param {string} frameworks the directory of the framework corpus
 * @param {string} stageDir
 * @param {{evaluate: (expression: string) => Promise<any>}} browser
 * @return {Promise<{checked: number, bad: ValueChange[]}>}
 */
async function checkStage(stage, frameworks, stageDir, browser) {
  const descriptor = (await import(join(stageDir, stage, 'index.js'))).default;
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
      oneStagePlugin(descriptor)()
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
  const stages = ['postcss-colormin', 'postcss-normalize-timing-functions'];
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
