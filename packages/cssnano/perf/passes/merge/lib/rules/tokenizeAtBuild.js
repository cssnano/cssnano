// Counts the token lists that the build of the records pushes. The build
// tokenizes each distinct selector item of a stylesheet once, when it first
// interns the item, so its pushes equal the distinct items of the rules. The
// full run also reports how often the selector analyses run without a cache,
// beside the rules, so the cost of tokenizing at the build is on record.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { Session } from 'node:inspector/promises';
import { test } from 'node:test';
import postcss from 'postcss';
import { buildRecords } from '../../../../../src/passes/ir/buildRecords.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { TokenLists } from '../../../../../src/passes/ir/tokenLists.js';
import { tokenizeMode } from '../../../../../src/values/tokenizeMode.js';

const session = new Session();
session.connect();
await session.post('Profiler.enable');
await session.post('Profiler.startPreciseCoverage', {
  callCount: true,
  detailed: false,
});

const { default: preset } =
  await import('../../../../../src/presets/default.js');

const ANALYSES = /** @type {const} */ ([
  ['/passes/merge/lib/rules/ensureCompatibility.js', 'selectorInfoOf'],
  ['/passes/merge/lib/rules/elementKeys.js', 'elementKeyOf'],
]);

/** @type {number} the pushes of the token lists since the last reset */
let pushes = 0;
const push = TokenLists.prototype.push;
TokenLists.prototype.push = function (tokens) {
  pushes++;
  return push.call(this, tokens);
};

const frameworksDir = new URL(
  '../../../../../../../frameworks/',
  import.meta.url
);

/**
 * The selector of a rule as written: PostCSS's raw, when it still spells the
 * cleaned selector, and the cleaned selector otherwise.
 *
 * @param {postcss.Rule} rule
 * @return {string}
 */
function writtenSelectorOf(rule) {
  const raw = rule.raws.selector;
  return raw !== undefined && raw.value === rule.selector
    ? raw.raw
    : rule.selector;
}

/**
 * @param {postcss.Root} root
 * @return {number} the distinct selector items of every rule under the root, at any depth,
 * as written
 */
function distinctItemsOf(root) {
  const items = new Set();
  root.walkRules((rule) => {
    for (const item of postcss.list.comma(writtenSelectorOf(rule))) {
      items.add(item);
    }
  });
  return items.size;
}

/**
 * @param {postcss.Root} root
 * @return {number} the distinct (tokenizer mode, text) pairs that the build
 * tokenizes once each, as written and cleaned: the values of the declarations,
 * the preludes of the at-rules and the selectors of the rules. The selectors
 * and preludes are in the default mode, which a value of that mode shares.
 */
function distinctValuesOf(root) {
  const values = new Set();
  root.walkDecls((decl) => {
    const mode = tokenizeMode(decl.prop) ? 'range' : 'default';
    values.add(`${mode}\0${decl.value}`);
    values.add(
      `${mode}\0${decl.raws.value?.value === decl.value ? (decl.raws.value.raw ?? decl.value) : decl.value}`
    );
  });
  root.walkAtRules((atRule) => {
    const params = atRule.params ?? '';
    values.add(`default\0${params}`);
    values.add(
      `default\0${atRule.raws.params?.value === params ? atRule.raws.params.raw : params}`
    );
  });
  root.walkRules((rule) => {
    values.add(`default\0${writtenSelectorOf(rule)}`);
  });
  return values.size;
}

/**
 * @param {import('node:inspector').Profiler.ScriptCoverage[]} coverage
 * @return {number} the calls of the selector analyses in the coverage taken
 */
function analysisCalls(coverage) {
  let calls = 0;
  for (const script of coverage) {
    for (const [module, functionName] of ANALYSES) {
      if (!script.url.endsWith(module)) continue;
      for (const fn of script.functions) {
        if (fn.functionName === functionName) calls += fn.ranges[0].count;
      }
    }
  }
  return calls;
}

// A take resets the counts, so the imports' calls are dropped here.
await session.post('Profiler.takePreciseCoverage');

for (const file of readdirSync(frameworksDir).toSorted()) {
  const css = readFileSync(new URL(file, frameworksDir), 'utf8');
  test(`the build of ${basename(file, '.css')} pushes one list per distinct selector item and per distinct value`, async () => {
    const root = postcss.parse(css);
    const distinct = distinctItemsOf(root) + distinctValuesOf(root);
    pushes = 0;
    buildRecords(root, createRunContext());
    assert.equal(pushes, distinct);
  });

  test(`the full run of ${basename(file, '.css')} reports its selector analyses`, async () => {
    await session.post('Profiler.takePreciseCoverage');
    await postcss(preset()).process(css, { from: undefined });
    const { result } = await session.post('Profiler.takePreciseCoverage');
    console.log(
      `${basename(file, '.css')}: ${analysisCalls(result)} selector analysis calls`
    );
  });
}
