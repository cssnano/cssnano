import { launchChromium } from '../../../../../../util/chromium.js';
import {
  FAILURE_EXIT_CODE,
  parseFuzzArgs,
} from '../../../../../../util/fuzzRunner.js';
import { elements } from './lib/cascadeOracle.js';
import { processBatched } from './lib/fuzzCrossBlock.js';
import {
  assertFamilyCoverage,
  generateFamilyCases,
} from './lib/mergeOracle.js';

/**
 * @typedef {{input: string, output: string}} Pair
 * @typedef {{index: number, media: string, direction: string, element: string, property: string, before: string, after: string}} BrowserDifference
 * @typedef {Awaited<ReturnType<typeof launchChromium>>} Browser
 */

// The default export of the package runs preset-default.
const presetUrl = new URL('../../../../src/index.js', import.meta.url);

/**
 * Runs in the page. Builds one host element per oracle element, so the
 * browser and the oracle see the same document; `::before` is read from its
 * host. Elements inside a `div` share one plain wrapper, which matches the
 * same rules as the oracle's bare `div`.
 *
 * @param {{name: string, tag: string, classes: string[], id: boolean, inDiv: boolean, pseudo: boolean}[]} hosts
 */
function buildFixture(hosts) {
  const doc = globalThis.document;
  doc.head.innerHTML = '<style id="sheet"></style>';
  doc.body.innerHTML = '<div id="wrapper"></div>';
  const wrapper = doc.querySelector('#wrapper');
  wrapper.removeAttribute('id');
  for (const host of hosts) {
    if (host.pseudo) continue;
    const node = doc.createElement(host.tag);
    node.className = host.classes.join(' ');
    if (host.id) node.id = 'i';
    node.dataset.name = host.name;
    (host.inDiv ? wrapper : doc.body).append(node);
  }
}

/**
 * Runs in the page. For each pair, reads the computed value of every
 * longhand either stylesheet declares, plus `direction`, on every element and
 * `::before`, and returns the first difference per pair and direction.
 *
 * @param {{pairs: Pair[], directions: string[]}} options
 */
function pageDifferences({ pairs, directions }) {
  const doc = globalThis.document;
  const style = doc.querySelector('#sheet');
  const hosts = [...doc.querySelectorAll('[data-name]')];
  const targets = hosts.flatMap((host) => [
    { host, pseudo: null, name: host.dataset.name },
    { host, pseudo: '::before', name: `${host.dataset.name}::before` },
  ]);
  // The browser's own expansion of the declarations it accepted, so a
  // shorthand reads as the longhands it sets and a dropped one reads as none.
  const declaredLonghands = (css, found) => {
    style.textContent = css;
    const rules = [...style.sheet.cssRules];
    while (rules.length > 0) {
      const rule = rules.pop();
      if (rule.style) for (const property of rule.style) found.add(property);
      if (rule.cssRules) rules.push(...rule.cssRules);
    }
  };
  const read = (css, properties) => {
    style.textContent = css;
    return targets.flatMap(({ host, pseudo }) => {
      const computed = globalThis.getComputedStyle(host, pseudo);
      return properties.map((property) => computed.getPropertyValue(property));
    });
  };
  const differences = [];
  for (const [index, { input, output }] of pairs.entries()) {
    const found = new Set(['direction']);
    declaredLonghands(input, found);
    declaredLonghands(output, found);
    const properties = [...found];
    for (const direction of directions) {
      doc.documentElement.dir = direction;
      const before = read(input, properties);
      const after = read(output, properties);
      const slot = before.findIndex((value, i) => value !== after[i]);
      if (slot === -1) continue;
      differences.push({
        index,
        direction,
        element: targets[Math.trunc(slot / properties.length)].name,
        property: properties[slot % properties.length],
        before: before[slot],
        after: after[slot],
      });
    }
  }
  return differences;
}

/**
 * Loads the oracle's elements into a fresh page.
 *
 * @param {Browser} browser
 * @return {Promise<void>}
 */
export async function loadFixture(browser) {
  await browser.evaluate(`(${buildFixture})(${JSON.stringify(elements)})`);
}

/**
 * Every place where Chromium computes a different style for a pair's output
 * than for its input, at most one per pair and environment, under screen and
 * print media and both directions.
 *
 * @param {Browser} browser with the fixture loaded
 * @param {Pair[]} pairs
 * @return {Promise<BrowserDifference[]>}
 */
export async function browserDifferences(browser, pairs) {
  const argument = JSON.stringify({ pairs, directions: ['ltr', 'rtl'] });
  const differences = [];
  for (const media of ['screen', 'print']) {
    await browser.setMedia(media);
    const found = await browser.evaluate(`(${pageDifferences})(${argument})`);
    for (const difference of found) differences.push({ ...difference, media });
  }
  return differences;
}

/**
 * Runs preset-default on `cases` a chunk at a time and returns the first case
 * whose output Chromium styles differently from its input. Cases that don't
 * terminate are left to the oracle fuzzer, which reports them.
 *
 * @param {Browser} browser with the fixture loaded
 * @param {{css: string}[]} cases
 * @param {number} [chunkSize]
 * @return {Promise<(BrowserDifference & Pair) | undefined>}
 */
export async function firstBrowserDifference(browser, cases, chunkSize = 100) {
  for (let start = 0; start < cases.length; start += chunkSize) {
    const chunk = cases.slice(start, start + chunkSize).map((item) => item.css);
    const results = processBatched(chunk, { pluginUrl: presetUrl });
    const indices = [];
    const pairs = [];
    for (const [offset, input] of chunk.entries()) {
      const output = results.get(input)?.css;
      if (output === undefined) continue;
      indices.push(start + offset);
      pairs.push({ input, output });
    }
    const [first] = await browserDifferences(browser, pairs);
    if (first) {
      return { ...first, ...pairs[first.index], index: indices[first.index] };
    }
  }
  return undefined;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const executablePath = process.env.CHROMIUM_PATH;
  if (!executablePath) {
    console.error('Set CHROMIUM_PATH to a Chromium or Chrome executable.');
    process.exit(2);
  }
  const { seed, count } = parseFuzzArgs({
    defaultCount: 1000,
    defaultSeed: 0x5eed,
  });
  const cases = generateFamilyCases(seed, count);
  assertFamilyCoverage(cases);
  const browser = await launchChromium(executablePath);
  let difference;
  try {
    await loadFixture(browser);
    difference = await firstBrowserDifference(browser, cases);
  } finally {
    await browser.close();
  }
  if (difference) {
    const { index, input, output, ...where } = difference;
    console.error(
      `seed=${seed} case=${index} computed style changed in Chromium\n` +
        `input=${input}\noutput=${output}\ndetail=${JSON.stringify(where)}`
    );
    process.exit(FAILURE_EXIT_CODE);
  }
  console.log(`${cases.length} family stylesheets, seed ${seed}, clean`);
}
