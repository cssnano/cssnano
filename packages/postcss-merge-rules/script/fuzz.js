import assert from 'node:assert/strict';
import postcss from 'postcss';
import browserslist from 'browserslist';
import plugin from '../src/index.js';
import {
  ensureCompatibility as currentCompatibility,
  noVendor,
} from '../src/lib/ensureCompatibility.js';
import { ensureCompatibility as legacyCompatibility } from './legacy/ensureCompatibility.js';

const modes = ['IE 6', 'IE 7', 'IE 11', 'Chrome 60', 'Chrome 120', 'defaults'];
const explicit = [
  ['a]', 'malformed-delimiter'],
  ['a)', 'malformed-delimiter'],
  ['a::', 'malformed-pseudo'],
  ['[(])', 'mismatched-nesting'],
  ['[data-x="a]b)c"]', 'string-delimiters'],
  ['[data-x="a\\]b\\)\\[\\("]', 'escaped-delimiters'],
  ['a/* ] ) [ ( */:not([x="("])', 'comments-and-functions'],
  ['svg|a > :is(.x, [data-y~="z"]):not(:has(+ b))', 'nested-selector-list'],
];

function random(seed) {
  let state = Number(seed) % 4294967296;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const pick = (rand, values) => values[Math.floor(rand() * values.length)];

function generatedSelector(rand, index) {
  const atoms = [
    `.${pick(rand, ['a', 'b', 'item', `x${index}`])}`,
    `#x${index}`,
    pick(rand, ['a', 'button', '*', 'svg|a', '|a', 'ns|*']),
    `[data-${index}]`,
    `[href${pick(rand, ['=', '~=', '|=', '^=', '$=', '*='])}"v${index}"]`,
    `[data-x="v${index}" i]`,
    pick(rand, [
      ':hover',
      ':not(.x)',
      ':is(a, b)',
      ':nth-child(2n + 1)',
      ':nonsense',
      '::-webkit-thing',
    ]),
  ];
  let selector = pick(rand, atoms);
  if (rand() < 0.65) {
    selector +=
      pick(rand, [' > ', ' + ', ' ~ ', ' ', '/*c*/>']) + pick(rand, atoms);
  }
  if (rand() < 0.28) selector = `:is(${selector}, :not(${pick(rand, atoms)}))`;
  if (rand() < 0.2) selector = `  ${selector}  `;
  return selector;
}

/** Return deterministic inputs and coverage metadata for a seed. */
export function generateCases(seed = 0x5eed, count = 400) {
  const rand = random(seed);
  const cases = explicit.map(([selector, branch], index) => ({
    selector,
    branch,
    browsers: modes[index % modes.length],
    features: featureMetadata(selector),
  }));
  while (cases.length < count) {
    const selector = generatedSelector(rand, cases.length);
    cases.push({
      selector,
      branch: 'compositional',
      browsers: pick(rand, modes),
      features: featureMetadata(selector),
    });
  }
  return cases.slice(0, count);
}

function featureMetadata(selector) {
  const features = [];
  if (/[>+~]/.test(selector)) features.push('combinator');
  if (selector.includes('[')) features.push('attribute');
  if (/\bi\]/i.test(selector)) features.push('attribute-flag');
  if (selector.includes(':')) features.push('pseudo');
  if (selector.includes('\\')) features.push('escape');
  if (selector.includes('/*')) features.push('comment');
  if (/["']/.test(selector)) features.push('string');
  return features;
}

/** Return a canonical structural description, independent of generated names. */
export function structuralShape(selector) {
  const combinators = new Set();
  for (const match of selector.matchAll(/(?:^|[^\\])[>+~]/g))
    combinators.add(match[0].at(-1));
  if (/\s+(?=[.#*:a-z])/i.test(selector) || /\s+\[/.test(selector))
    combinators.add('descendant');

  const attributes = [...selector.matchAll(/\[([^\]]*)\]/g)].flatMap(
    (match) => {
      const value = match[1];
      const operator = value.match(/(?:~|\||\^|\$|\*)?=/)?.[0];
      return [operator ?? 'presence'];
    }
  );
  const namespace =
    /(?:^|[\s,(>+~])(?:[a-z][\w-]*|\*)?\|(?:[a-z][\w-]*|\*)/i.test(selector)
      ? 'present'
      : 'absent';
  let depth = 0;
  let maxDepth = 0;
  for (const character of selector) {
    if (character === '(') maxDepth = Math.max(maxDepth, ++depth);
    if (character === ')') depth--;
  }
  const canonical = selector
    .replace(/(?:data-)?\d+/gi, 'N')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    key: JSON.stringify([
      canonical,
      [...combinators].toSorted(),
      [...new Set(attributes)].toSorted(),
      namespace,
      Math.min(maxDepth, 3),
      selector.includes('/*'),
      /["']/.test(selector),
      selector.includes('\\'),
    ]),
    combinators,
    attributes: new Set(attributes),
    namespace,
    maxDepth,
  };
}

/** Minimize a selector while retaining a caller-defined mismatch predicate. */
export function shrinkSelector(selector, mismatch) {
  let candidate = selector;
  let changed = true;
  while (changed) {
    changed = false;
    for (let index = 0; index < candidate.length; index++) {
      const shorter = candidate.slice(0, index) + candidate.slice(index + 1);
      if (shorter && mismatch(shorter)) {
        candidate = shorter;
        changed = true;
        break;
      }
    }
  }
  return candidate;
}

function firstDifference(a, b) {
  const length = Math.min(a.length, b.length);
  for (let index = 0; index < length; index++)
    if (a[index] !== b[index]) return index;
  return length;
}

function malformed(selector) {
  return ['a]', 'a)', 'a::', '[(])'].includes(selector);
}

function report(caseData, legacy, current, expected, actual) {
  const index = firstDifference(expected, actual);
  return [
    `seed=${caseData.seed} case=${caseData.index} branch=${caseData.branch} browsers=${caseData.browsers}`,
    `selector=${JSON.stringify(caseData.selector)}`,
    `legacy=${legacy} current=${current}`,
    `legacy-expected=${JSON.stringify(expected)}`,
    `actual=${JSON.stringify(actual)} first-differing-byte=${index}`,
  ].join('\n');
}

// eslint-disable-next-line complexity
export async function runFuzz({ seed = 0x5eed, count = 400 } = {}) {
  const cases = generateCases(seed, count);
  const branches = new Set();
  const features = new Set();
  const shapes = new Set();
  const combinators = new Set();
  const attributeOperators = new Set();
  const nestingDepths = new Set();
  const namespaces = new Set();
  for (let index = 0; index < cases.length; index++) {
    const item = cases[index];
    const caseData = { ...item, seed, index };
    branches.add(item.branch);
    for (const feature of item.features ?? featureMetadata(item.selector))
      features.add(feature);
    const shape = structuralShape(item.selector);
    shapes.add(shape.key);
    for (const value of shape.combinators) combinators.add(value);
    for (const value of shape.attributes) attributeOperators.add(value);
    nestingDepths.add(Math.min(shape.maxDepth, 3));
    namespaces.add(shape.namespace);
    const browsers = browserslist(item.browsers);
    let legacy;
    try {
      legacy = legacyCompatibility([item.selector], browsers);
    } catch {
      legacy = null;
    }
    const current = currentCompatibility([item.selector], browsers);
    if (legacy !== null && legacy !== current && !malformed(item.selector)) {
      const minimized = shrinkSelector(item.selector, (selector) => {
        try {
          return (
            legacyCompatibility([selector], browsers) !==
            currentCompatibility([selector], browsers)
          );
        } catch {
          return false;
        }
      });
      throw new Error(
        report(
          { ...caseData, selector: minimized },
          legacy,
          current,
          'n/a',
          'n/a'
        )
      );
    }
    let parsed;
    try {
      parsed = postcss.parse(`${item.selector}{color:red}b{color:red}`);
    } catch {
      continue;
    }
    if (legacy === null) continue;
    const legacyMerge = legacy && noVendor(item.selector);
    const normalizedSelector = legacyMerge
      ? item.selector.trimEnd()
      : item.selector;
    const expected = legacyMerge
      ? `${normalizedSelector},b{color:red}`
      : `${normalizedSelector}{color:red}b{color:red}`;
    const actual = (
      await postcss([plugin({ overrideBrowserslist: item.browsers })]).process(
        parsed,
        { from: undefined }
      )
    ).css;
    if (legacy !== current && malformed(item.selector)) continue;
    if (actual !== expected)
      throw new Error(report(caseData, legacy, current, expected, actual));
  }
  assert.ok(
    branches.size >= 3,
    `insufficient grammar branch coverage: ${branches.size}`
  );
  assert.ok(
    features.size >= 5,
    `insufficient feature coverage: ${features.size}`
  );
  for (const required of ['>', '+', '~', 'descendant'])
    assert.ok(
      combinators.has(required),
      `missing combinator shape: ${required}`
    );
  for (const required of ['presence', '=', '~=', '|=', '^=', '$=', '*='])
    assert.ok(
      attributeOperators.has(required),
      `missing attribute shape: ${required}`
    );
  assert.ok(
    nestingDepths.has(2) || nestingDepths.has(3),
    'missing nested function shape'
  );
  assert.deepEqual(
    namespaces,
    new Set(['present', 'absent']),
    'missing namespace shape'
  );
  assert.ok(
    shapes.size >= Math.min(30, count),
    `insufficient semantic shape coverage: ${shapes.size}`
  );
  return {
    cases: cases.length,
    branches: [...branches],
    features: [...features],
    shapes: shapes.size,
    shapeDimensions: {
      combinators: [...combinators],
      attributeOperators: [...attributeOperators],
      nestingDepths: [...nestingDepths],
      namespaces: [...namespaces],
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const value = (name, fallback) => {
    const argument = args.findIndex(
      (arg) => arg === name || arg.startsWith(`${name}=`)
    );
    if (argument === -1) return fallback;
    const inline = args[argument].slice(name.length + 1);
    return Number(inline || args[argument + 1]);
  };
  const seed = value('--seed', 0x5eed);
  const count = value('--count', 1000);
  try {
    console.log(JSON.stringify(await runFuzz({ seed, count })));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
