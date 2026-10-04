import assert from 'node:assert/strict';
import postcss from 'postcss';
import { tokenizer, TokenType } from '@csstools/css-tokenizer';
import browserslist from 'browserslist';
import plugin from '../src/index.js';
import {
  createSelectorLookup,
  selectorsCompatible,
} from '../src/lib/ensureCompatibility.js';
import {
  ensureCompatibility as legacyCompatibility,
  noVendor,
} from './legacy/ensureCompatibility.js';
import { featureMetadata, generateCases } from './lib/fuzzGenerate.js';
import {
  firstCrossBlockFailure,
  generateCrossBlockCases,
} from './lib/fuzzCrossBlock.js';
import {
  assertCascadeCoverage,
  firstCascadeFailure,
  generateCascadeCases,
} from './lib/fuzzCascade.js';
import {
  FAILURE_EXIT_CODE,
  parseFuzzArgs,
  runFuzz,
} from '../../../util/fuzzRunner.js';

/**
 * @param {string[]} selectors
 * @param {string[]=} browsers
 * @param {Map<string, SelectorInfo>=} cache
 * @return {boolean}
 */
export function currentCompatibility(selectors, browsers, cache) {
  return selectorsCompatible(selectors, createSelectorLookup(browsers, cache));
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

/** Format a failure from `check` for the shared runner. */
export function report(failure, seed, index) {
  const { item, legacy, current, expected, actual } = failure;
  return [
    `seed=${seed} case=${index} branch=${item.branch} browsers=${item.browsers}`,
    `selector=${JSON.stringify(item.selector)}`,
    `legacy=${legacy} current=${current}`,
    `legacy-expected=${JSON.stringify(expected)}`,
    `actual=${JSON.stringify(actual)} first-differing-byte=${firstDifference(expected, actual)}`,
  ].join('\n');
}

export { generateCases };

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

function checkCompatibility(item, browsers) {
  let legacy;
  try {
    legacy = legacyCompatibility([item.selector], browsers);
  } catch {
    legacy = null;
  }
  const current = currentCompatibility([item.selector], browsers);
  if (
    legacy !== null &&
    legacy !== current &&
    !hasSeparatorComment(item.selector)
  ) {
    const selector = shrinkSelector(item.selector, (candidate) => {
      try {
        return (
          legacyCompatibility([candidate], browsers) !==
          currentCompatibility([candidate], browsers)
        );
      } catch {
        return false;
      }
    });
    return {
      legacy,
      current,
      failure: {
        item: { ...item, selector },
        legacy,
        current,
        expected: 'n/a',
        actual: 'n/a',
      },
    };
  }
  return { legacy, current };
}

function verifyTransform(item, legacy, current) {
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
  // The plugin is synchronous, so `.css` is available without awaiting.
  const actual = postcss([
    plugin({ overrideBrowserslist: item.browsers }),
  ]).process(parsed, { from: undefined }).css;
  if (legacy !== current && hasSeparatorComment(item.selector)) return;
  if (actual !== expected) return { item, legacy, current, expected, actual };
}

/** An invalid selector must survive byte-identical, whatever the browsers. */
function verifyInvalid(item) {
  const input = `${item.selector}{color:red}b{color:red}`;
  let parsed;
  try {
    parsed = postcss.parse(input);
  } catch {
    return;
  }
  const actual = postcss([
    plugin({ overrideBrowserslist: item.browsers }),
  ]).process(parsed, { from: undefined }).css;
  if (actual !== input) {
    return {
      item,
      legacy: 'n/a',
      current: 'n/a',
      expected: input,
      actual,
    };
  }
}

/** Return a failure report if the plugin disagrees with the oracle. */
export function check(item) {
  if (item.invalid) return verifyInvalid(item);
  const { legacy, current, failure } = checkCompatibility(
    item,
    browserslist(item.browsers)
  );
  return failure ?? verifyTransform(item, legacy, current);
}

/** Assert that the generated cases exercise the selector grammar broadly. */
export function assertCoverage(cases) {
  const coverage = {
    branches: new Set(),
    features: new Set(),
    shapes: new Set(),
    combinators: new Set(),
    attributeOperators: new Set(),
    nestingDepths: new Set(),
    namespaces: new Set(),
  };
  for (const item of cases) {
    if (!item.invalid) recordCoverage(item, coverage);
  }
  assert.ok(
    cases.some((item) => item.invalid),
    'missing invalid selectors'
  );
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
    coverage.shapes.size >= Math.min(30, cases.length),
    `insufficient semantic shape coverage: ${coverage.shapes.size}`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { seed, count, interval } = parseFuzzArgs({
    defaultCount: 1000,
    defaultSeed: 0x5eed,
  });
  const cases = generateCases(seed, count);
  assertCoverage(cases);
  runFuzz({
    cases,
    check,
    report: (failure, _seed, index) => report(failure, seed, index),
    count,
    seed,
    interval,
  });

  // Stylesheets are checked in child processes because a merge loop is
  // synchronous and would otherwise hang the fuzzer.
  const stylesheets = generateCrossBlockCases(seed, Math.min(count, 500));
  const failure = firstCrossBlockFailure(stylesheets);
  if (failure) {
    console.error(
      `seed=${seed} cross-block ${failure.reason}\n` +
        `input=${failure.input}\noutput=${failure.output}`
    );
    process.exit(FAILURE_EXIT_CODE);
  }
  console.log(
    `${stylesheets.length} cross-block stylesheets, seed ${seed}, clean`
  );

  // Rules whose selectors match overlapping elements, checked per element.
  const cascadeCases = generateCascadeCases(seed, Math.min(count, 2000));
  assertCascadeCoverage(cascadeCases);
  const cascadeFailure = firstCascadeFailure(cascadeCases);
  if (cascadeFailure) {
    console.error(
      `seed=${seed} case=${cascadeFailure.index} cascade ${cascadeFailure.reason}\n` +
        `input=${cascadeFailure.input}\noutput=${cascadeFailure.output}\n` +
        `detail=${cascadeFailure.detail}`
    );
    process.exit(FAILURE_EXIT_CODE);
  }
  console.log(
    `${cascadeCases.length} cascade stylesheets, seed ${seed}, clean`
  );
}
