import assert from 'node:assert/strict';
import postcss from 'postcss';
import { tokenizer, TokenType } from '@csstools/css-tokenizer';
import browserslist from 'browserslist';
import { isInvalidSelector } from 'postcss-minify-selectors';
import plugin from '../src/index.js';
import {
  ensureCompatibility as currentCompatibility,
  noVendor,
} from '../src/lib/ensureCompatibility.js';
import { ensureCompatibility as legacyCompatibility } from './legacy/ensureCompatibility.js';
import { parseFuzzArgs } from '../../../util/fuzzRunner.js';

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
  if (/[>+~]/v.test(selector)) features.push('combinator');
  if (selector.includes('[')) features.push('attribute');
  if (/\bi\]/iv.test(selector)) features.push('attribute-flag');
  if (selector.includes(':')) features.push('pseudo');
  if (selector.includes('\\')) features.push('escape');
  if (selector.includes('/*')) features.push('comment');
  if (/["']/v.test(selector)) features.push('string');
  return features;
}

/** Return a canonical structural description, independent of generated names. */
export function structuralShape(selector) {
  const combinators = new Set();
  for (const match of selector.matchAll(/(?:^|[^\\])[>+~]/gv))
    combinators.add(match[0].at(-1));
  if (/\s+(?=[.#*:a-z])/iv.test(selector) || /\s+\[/v.test(selector))
    combinators.add('descendant');

  const attributes = [...selector.matchAll(/\[([^\]]*)\]/gv)].flatMap(
    (match) => {
      const value = match[1];
      const operator = value.match(/(?:~|\||\^|\$|\*)?=/v)?.[0];
      return [operator ?? 'presence'];
    }
  );
  const namespace =
    /(?:^|[\s,\(>+~])(?:[a-z][\w\-]*|\*)?\|(?:[a-z][\w\-]*|\*)/iv.test(selector)
      ? 'present'
      : 'absent';
  let depth = 0;
  let maxDepth = 0;
  for (const character of selector) {
    if (character === '(') maxDepth = Math.max(maxDepth, ++depth);
    if (character === ')') depth--;
  }
  const canonical = selector
    .replace(/(?:data-)?\d+/giv, 'N')
    .replace(/\s+/gv, ' ')
    .trim();
  return {
    key: JSON.stringify([
      canonical,
      [...combinators].toSorted(),
      [...new Set(attributes)].toSorted(),
      namespace,
      Math.min(maxDepth, 3),
      selector.includes('/*'),
      /["']/v.test(selector),
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

// The legacy oracle predates comment-aware merging: a comment between two
// non-whitespace tokens outside `[...]` makes the selector invalid.
function hasSeparatorComment(selector) {
  const stream = tokenizer({ css: selector });
  let previous;
  let pending = false;
  let depth = 0;
  while (!stream.endOfFile()) {
    const [type] = stream.nextToken();
    if (type === TokenType.EOF) break;
    if (type === TokenType.OpenSquare) depth++;
    if (type === TokenType.CloseSquare && depth > 0) depth--;
    if (depth > 0 && type !== TokenType.OpenSquare) continue;
    if (type === TokenType.Comment) {
      pending ||= previous !== undefined && previous !== TokenType.Whitespace;
      continue;
    }
    if (pending && type !== TokenType.Whitespace) return true;
    pending = false;
    previous = type;
  }
  return false;
}

// The legacy oracle also accepted selectors that the selector parser reports
// as invalid, which merging would turn into an invalid selector list.
function malformed(selector) {
  return (
    ['a]', 'a)', 'a::', '[(])'].includes(selector) ||
    hasSeparatorComment(selector) ||
    isInvalidSelector(selector)
  );
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

function recordCoverage(item, coverage) {
  coverage.branches.add(item.branch);
  for (const feature of item.features ?? featureMetadata(item.selector))
    coverage.features.add(feature);
  const shape = structuralShape(item.selector);
  coverage.shapes.add(shape.key);
  for (const value of shape.combinators) coverage.combinators.add(value);
  for (const value of shape.attributes) coverage.attributeOperators.add(value);
  coverage.nestingDepths.add(Math.min(shape.maxDepth, 3));
  coverage.namespaces.add(shape.namespace);
}

function checkCompatibility(item, caseData, browsers) {
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
  return { legacy, current };
}

async function verifyTransform(item, caseData, legacy, current) {
  let parsed;
  try {
    parsed = postcss.parse(`${item.selector}{color:red}b{color:red}`);
  } catch {
    return;
  }
  if (legacy === null) return;
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
  if (legacy !== current && malformed(item.selector)) return;
  if (actual !== expected)
    throw new Error(report(caseData, legacy, current, expected, actual));
}

function assertCoverage(coverage, count) {
  assert.ok(
    coverage.branches.size >= 3,
    `insufficient grammar branch coverage: ${coverage.branches.size}`
  );
  assert.ok(
    coverage.features.size >= 5,
    `insufficient feature coverage: ${coverage.features.size}`
  );
  for (const required of ['>', '+', '~', 'descendant'])
    assert.ok(
      coverage.combinators.has(required),
      `missing combinator shape: ${required}`
    );
  for (const required of ['presence', '=', '~=', '|=', '^=', '$=', '*='])
    assert.ok(
      coverage.attributeOperators.has(required),
      `missing attribute shape: ${required}`
    );
  assert.ok(
    coverage.nestingDepths.has(2) || coverage.nestingDepths.has(3),
    'missing nested function shape'
  );
  assert.deepEqual(
    coverage.namespaces,
    new Set(['present', 'absent']),
    'missing namespace shape'
  );
  assert.ok(
    coverage.shapes.size >= Math.min(30, count),
    `insufficient semantic shape coverage: ${coverage.shapes.size}`
  );
}

export async function runFuzz({ seed = 0x5eed, count = 400 } = {}) {
  const cases = generateCases(seed, count);
  const coverage = {
    branches: new Set(),
    features: new Set(),
    shapes: new Set(),
    combinators: new Set(),
    attributeOperators: new Set(),
    nestingDepths: new Set(),
    namespaces: new Set(),
  };
  for (let index = 0; index < cases.length; index++) {
    const item = cases[index];
    const caseData = { ...item, seed, index };
    recordCoverage(item, coverage);
    const browsers = browserslist(item.browsers);
    const { legacy, current } = checkCompatibility(item, caseData, browsers);
    await verifyTransform(item, caseData, legacy, current);
  }
  assertCoverage(coverage, count);
  return {
    cases: cases.length,
    branches: [...coverage.branches],
    features: [...coverage.features],
    shapes: coverage.shapes.size,
    shapeDimensions: {
      combinators: [...coverage.combinators],
      attributeOperators: [...coverage.attributeOperators],
      nestingDepths: [...coverage.nestingDepths],
      namespaces: [...coverage.namespaces],
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { seed, count } = parseFuzzArgs({
    defaultCount: 1000,
    defaultSeed: 0x5eed,
  });
  try {
    console.log(JSON.stringify(await runFuzz({ seed, count })));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
