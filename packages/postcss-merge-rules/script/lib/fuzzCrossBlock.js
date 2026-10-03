import { spawnSync } from 'node:child_process';
import postcss from 'postcss';
import { random } from '../../../../util/fuzzRng.js';

const defaultPluginUrl = new URL('../../src/index.js', import.meta.url).href;

const wrappers = ['@media print', '@supports (color:red)'];
// Rule-less at-rules cannot be merged into, so a block moved across one
// exercises the plugin's cross-parent bookkeeping.
const separators = [
  '',
  '@layer x;',
  '@font-face{font-family:x}',
  '@page{margin:0}',
];
// Each rule has a distinct selector so that merging them is a choice, and
// `color:blue` conflicts with `color:red` so that reordering is observable.
const rules = [
  '.c{top:0;color:red}',
  '.a{color:red}',
  '.b{}',
  '.d{color:red;left:0}',
  '.e{top:0}',
  '.a{color:blue}',
  '.d{left:0}',
];
// Items of a rule that has nested rules. A declaration after a nested rule
// is a CSSNestedDeclarations rule, so moving or merging a nested rule across
// it changes the cascade of the parent; `&` keeps the specificity equal.
const nestedItems = [
  '&{color:red}',
  '&{color:blue}',
  '&{top:0}',
  '&{top:0;color:red}',
  'color:red;',
  'color:blue;',
  'top:0;',
];
const nestedParents = ['.p', '.q'];
// At-rule names are ASCII case-insensitive, so every spelling is a keyframes
// rule. Its keyframe selectors repeat and share declarations on purpose: merging
// them would make `from,to{…}` or repeat a selector, which is never needed.
const keyframesRules = [
  '@keyframes k{from{top:0;color:red}to{top:0;color:red}}',
  '@KEYFRAMES k{from{top:0;color:red}to{top:0;color:red}}',
  '@KeyFrames k{from{top:0}50%{top:0;color:red}to{color:red;top:0}}',
  '@-webkit-KEYFRAMES k{from{color:red}to{color:red}}',
];

/** @param {ReturnType<typeof random>} rng */
function nestedRule(rng) {
  const body = Array.from({ length: 2 + rng.int(3) }, () =>
    rng.pick(nestedItems)
  ).join('');
  return `${rng.pick(nestedParents)}{${body}}`;
}

/**
 * Stylesheets of two to five equal conditional blocks, each holding rules
 * that share declarations, some with nested `&` rules between declarations, optionally split by rule-less at-rules, with a
 * trailing top-level rule in some cases.
 *
 * @param {number} seed
 * @param {number} count
 * @return {string[]}
 */
export function generateCrossBlockCases(seed, count) {
  const rng = random(seed);
  return Array.from({ length: count }, () => {
    // Equal wrappers are the only blocks the plugin joins.
    const wrapper = rng.pick(wrappers);
    let css = '';
    for (let block = 2 + rng.int(4); block > 0; block--) {
      const body = Array.from({ length: 1 + rng.int(3) }, () =>
        rng.chance(0.3) ? nestedRule(rng) : rng.pick(rules)
      ).join('');
      css += `${wrapper}{${body}}${rng.pick(separators)}`;
      if (rng.chance(0.2)) css += rng.pick(keyframesRules);
    }
    return rng.chance(0.3)
      ? css + (rng.chance(0.5) ? nestedRule(rng) : rng.pick(rules))
      : css;
  });
}

/** @param {import('postcss').AtRule} node */
const isKeyframes = (node) => /^(?:-[a-z]+-)?keyframes$/iv.test(node.name);

/**
 * The serialized @keyframes rules of a stylesheet, sorted so that a rule
 * moving relative to others does not matter.
 *
 * @param {string} css
 * @return {string[]}
 */
function keyframesRulesOf(css) {
  const found = [];
  postcss.parse(css).walkAtRules((node) => {
    if (isKeyframes(node)) found.push(node.toString());
  });
  return found.toSorted();
}

/**
 * The value each single-class selector ends up with for each property, taking
 * the last declaration in source order. The generated wrappers are always
 * active together and specificity is equal, so source order is the cascade. A
 * nested `&` stands for each selector of its parent.
 *
 * @param {string} css
 * @return {Map<string, string>}
 */
export function cascadeWinners(css) {
  const winners = new Map();
  /** @param {import('postcss').Container} container @param {string[]} parents */
  const visit = (container, parents) => {
    for (const node of container.nodes ?? []) {
      if (node.type === 'decl') {
        for (const selector of parents)
          winners.set(`${selector} ${node.prop}`, node.value);
      } else if (node.type === 'rule') {
        visit(
          node,
          node.selectors.flatMap((selector) =>
            selector === '&' ? parents : [selector]
          )
        );
      } else if (node.type === 'atrule' && !isKeyframes(node)) {
        visit(node, parents);
      }
    }
  };
  visit(postcss.parse(css), []);
  return winners;
}

/**
 * Runs the plugin on every input in one child process under a time and heap
 * limit. A merge loop is synchronous, so a `node:test` timeout cannot
 * interrupt it. The child prints each input's index before processing it, so
 * a hang or crash is attributed to the last input started.
 *
 * @param {string[]} inputs
 * @param {{pluginUrl?: string, timeout?: number}} [options]
 * @return {{css: string[], terminated: boolean}}
 */
export function processAllWithLimits(
  inputs,
  { pluginUrl = defaultPluginUrl, timeout = 3000 } = {}
) {
  const script = `
    import postcss from 'postcss';
    import plugin from ${JSON.stringify(pluginUrl)};
    const inputs = ${JSON.stringify(inputs)};
    inputs.forEach((css, index) => {
      process.stdout.write(index + '\\n');
      process.stdout.write(JSON.stringify(postcss([plugin]).process(css, {from: undefined}).css) + '\\n');
    });
  `;
  const result = spawnSync(
    process.execPath,
    ['--max-old-space-size=256', '--input-type=module', '-e', script],
    { timeout, encoding: 'utf8', cwd: new URL('../..', import.meta.url) }
  );
  const css = (result.stdout ?? '')
    .split('\n')
    .filter(Boolean)
    .filter((_, index) => index % 2 === 1)
    .map((line) => JSON.parse(line));
  return { css, terminated: result.status !== 0 };
}

/**
 * Checks one stylesheet against the properties a merge must preserve: it
 * terminates, keeps the cascade and every @keyframes rule, never grows the output, and a second pass
 * changes nothing.
 *
 * @param {string} css
 * @param {(css: string) => {css: string | undefined, terminated: boolean}} run
 * @return {{reason: string, input: string, output?: string} | undefined}
 */
export function checkCrossBlock(css, run) {
  const first = run(css);
  if (first.terminated) return { reason: 'did not terminate', input: css };
  const output = first.css;
  const failure = (reason) => ({ reason, input: css, output });

  const before = cascadeWinners(css);
  const after = cascadeWinners(output);
  for (const [key, value] of before)
    if (after.get(key) !== value) return failure('cascade changed');
  if (output.length > css.length) return failure('output grew');
  // Merging inside @keyframes is never valid, whatever its case.
  if (keyframesRulesOf(css).join('\n') !== keyframesRulesOf(output).join('\n'))
    return failure('keyframes changed');

  const second = run(output);
  if (second.terminated || second.css !== output)
    return failure('second pass changed the output');
}

/**
 * Like `processAllWithLimits`, but a hang or crash marks only the input that
 * caused it and processing resumes with the remaining inputs.
 *
 * @param {string[]} inputs
 * @param {Parameters<typeof processAllWithLimits>[1]} [options]
 * @return {Map<string, {css: string | undefined, terminated: boolean}>}
 */
export function processBatched(inputs, options) {
  const results = new Map();
  let remaining = [...new Set(inputs)];
  while (remaining.length > 0) {
    const { css, terminated } = processAllWithLimits(remaining, options);
    for (const [index, output] of css.entries())
      results.set(remaining[index], { css: output, terminated: false });
    if (terminated) {
      results.set(remaining[css.length], { css: undefined, terminated: true });
    }
    remaining = remaining.slice(css.length + (terminated ? 1 : 0));
  }
  return results;
}

/**
 * Checks `inputs` in child processes, a chunk at a time so that a hanging
 * revision stops at the first failure instead of timing out on every case.
 *
 * @param {string[]} inputs
 * @return {ReturnType<typeof checkCrossBlock>}
 */
export function firstCrossBlockFailure(inputs, chunkSize = 25) {
  for (let start = 0; start < inputs.length; start += chunkSize) {
    const chunk = inputs.slice(start, start + chunkSize);
    const first = processBatched(chunk);
    const outputs = [...first.values()].flatMap(({ css }) =>
      css ? [css] : []
    );
    const second = processBatched(outputs);
    const run = (css) => first.get(css) ?? second.get(css);
    for (const css of chunk) {
      const failure = checkCrossBlock(css, run);
      if (failure) return failure;
    }
  }
}
