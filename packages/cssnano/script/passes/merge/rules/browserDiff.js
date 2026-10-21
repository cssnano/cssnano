import { availableParallelism } from 'node:os';
import { launchChromium } from '../../../../../../util/chromium.js';
import {
  FAILURE_EXIT_CODE,
  parseFuzzArgs,
} from '../../../../../../util/fuzzRunner.js';
import { buildFixture, pageDifferences } from './browserPage.js';
import { elements } from './lib/cascadeOracle.js';
import { processBatched } from './lib/fuzzCrossBlock.js';
import {
  assertFamilyCoverage,
  generateFamilyCases,
} from './lib/mergeOracle.js';

/**
 * @typedef {{input: string, output: string}} Pair
 * @typedef {{index: number, media: string, writingMode: string, direction: string, element: string, property: string, before: string, after: string}} BrowserDifference
 * @typedef {Awaited<ReturnType<typeof launchChromium>>} Browser
 */

// The default export of the package runs preset-default.
const presetUrl = new URL('../../../../src/index.js', import.meta.url);

const flowEnvironments = [
  'horizontal-tb',
  'vertical-rl',
  'vertical-lr',
].flatMap((writingMode) =>
  ['ltr', 'rtl'].map((direction) => [writingMode, direction])
);

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
 * print media, each writing mode and each direction.
 *
 * @param {Browser} browser with the fixture loaded
 * @param {Pair[]} pairs
 * @return {Promise<BrowserDifference[]>}
 */
export async function browserDifferences(browser, pairs) {
  // Vertical modes map logical sides to physical ones differently from the
  // horizontal mode the oracle models.
  const environments = flowEnvironments.map(([writingMode, direction]) => ({
    writingMode,
    direction,
  }));
  const argument = JSON.stringify({ pairs, environments });
  const differences = [];
  for (const media of ['screen', 'print']) {
    await browser.setMedia(media);
    const found = await browser.evaluate(`(${pageDifferences})(${argument})`);
    for (const difference of found) differences.push({ ...difference, media });
  }
  return differences;
}

// Cases the preset did not finish are skipped; a sweep that skips more than
// this share of its cases checked too little to count as clean.
export const maxSkippedShare = 0.02;

/**
 * Starts browsers with the fixture loaded. A page computes styles on one
 * thread, so the sweep spreads chunks over several. A failed start closes the
 * browsers that did start.
 *
 * @param {string} executablePath
 * @param {number} [size]
 * @return {Promise<Browser[]>}
 */
export async function launchPool(
  executablePath,
  size = Math.min(8, availableParallelism())
) {
  const settled = await Promise.allSettled(
    Array.from({ length: size }, async () => {
      const browser = await launchChromium(executablePath);
      try {
        await loadFixture(browser);
      } catch (error) {
        await browser.close();
        throw error;
      }
      return browser;
    })
  );
  const browsers = settled.flatMap((r) =>
    r.status === 'fulfilled' ? [r.value] : []
  );
  const failure = settled.find((r) => r.status === 'rejected');
  if (failure) {
    await closePool(browsers);
    throw failure.reason;
  }
  return browsers;
}

/**
 * @param {Browser[]} browsers
 * @return {Promise<void>}
 */
export async function closePool(browsers) {
  await Promise.all(browsers.map((browser) => browser.close()));
}

/**
 * Runs preset-default on `cases` a chunk at a time and finds the first case
 * whose output Chromium styles differently from its input. Browsers take
 * chunks concurrently, since a page computes styles on one thread. Cases that
 * don't terminate are skipped and counted; the oracle fuzzer reports them.
 *
 * @param {Browser | Browser[]} browsers with the fixture loaded
 * @param {{css: string}[]} cases
 * @param {number} [chunkSize]
 * @return {Promise<{difference: (BrowserDifference & Pair) | undefined, checked: number, skipped: number}>}
 */
export async function browserSweep(browsers, cases, chunkSize = 100) {
  const pool = Array.isArray(browsers) ? browsers : [browsers];
  const chunkCount = Math.ceil(cases.length / chunkSize);
  let next = 0;
  let stop = false;
  let processed = 0;
  let skipped = 0;
  /** @type {((BrowserDifference & Pair) | undefined)[]} */
  const found = [];
  await Promise.all(
    pool.map(async (browser) => {
      // Workers claim chunks in index order, so every chunk before a claimed
      // one is claimed too, and the lowest `found` entry is the earliest case.
      while (!stop && next < chunkCount) {
        const start = next++ * chunkSize;
        const chunk = cases
          .slice(start, start + chunkSize)
          .map((item) => item.css);
        // The preset runs only for chunks a worker reaches, so a difference
        // found early spares the rest.
        const results = processBatched(chunk, { pluginUrl: presetUrl });
        const indices = [];
        const pairs = [];
        for (const [offset, input] of chunk.entries()) {
          const output = results.get(input)?.css;
          if (output === undefined) {
            skipped++;
            continue;
          }
          indices.push(start + offset);
          pairs.push({ input, output });
        }
        processed += chunk.length;
        const [first] = await browserDifferences(browser, pairs);
        if (!first) continue;
        stop = true;
        found[start / chunkSize] = {
          ...first,
          ...pairs[first.index],
          index: indices[first.index],
        };
      }
    })
  );
  // Chunks finish out of order; report the earliest case, as a serial run would.
  const difference = found.find(Boolean);
  return { difference, checked: processed - skipped, skipped };
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
  const browsers = await launchPool(executablePath);
  let sweep;
  try {
    sweep = await browserSweep(browsers, cases);
  } finally {
    await closePool(browsers);
  }
  const { difference, skipped } = sweep;
  if (difference) {
    const { index, input, output, ...where } = difference;
    console.error(
      `seed=${seed} case=${index} computed style changed in Chromium\n` +
        `input=${input}\noutput=${output}\ndetail=${JSON.stringify(where)}`
    );
    process.exit(FAILURE_EXIT_CODE);
  }
  if (skipped > cases.length * maxSkippedShare) {
    console.error(
      `seed=${seed} ${skipped} of ${cases.length} cases were skipped; too few were checked`
    );
    process.exit(FAILURE_EXIT_CODE);
  }
  console.log(
    `${cases.length} family stylesheets, seed ${seed}, clean (${skipped} skipped)`
  );
}
