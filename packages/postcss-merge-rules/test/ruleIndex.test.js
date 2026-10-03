import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import createRuleIndex from '../src/lib/rule-index.js';

/**
 * Indexes `css`, replaces `target` the way a partial merge does (the rule
 * leaves the tree before the index is told), then moves `moving` into
 * `destination`, as a cross-parent merge does.
 *
 * @param {string} css
 * @param {{target: string, replacement: string, moving: string}} rewrite
 */
function replaceThenMove(css, { target, replacement, moving }) {
  const root = postcss.parse(css);
  const rules = new Map();
  root.walkRules((rule) => rules.set(rule.selector, rule));
  const index = createRuleIndex(new WeakMap());
  index.seed(root);
  const replaced = rules.get(target);
  const { previous, next } = index.active.get(replaced);
  const replacementRule = postcss.rule({ selector: replacement });
  replaced.replaceWith(replacementRule);
  index.detach(replaced);
  index.linkReplacements([replacementRule], previous, next, undefined);
  const mover = rules.get(moving);
  const newParent = replacementRule.parent;
  mover.remove();
  newParent.append(mover);
  index.repairMove(mover);
  return { index, replacementRule, mover };
}

test('rule index links a rule moved into a block after the rule that replaced the block’s last rule', () => {
  const { index, replacementRule, mover } = replaceThenMove(
    '@media print{.c{top:0}}@media print{.a{top:0}.b{top:0}}',
    { target: '.b', replacement: '.r', moving: '.c' }
  );
  assert.equal(index.active.get(mover).previous, replacementRule);
});

test('rule index keeps the rule before a replaced last rule as the block’s last rule when nothing replaces it', () => {
  const root = postcss.parse(
    '@media print{.a{top:0}.b{top:0}}@media print{.c{top:0}}'
  );
  const index = createRuleIndex(new WeakMap());
  index.seed(root);
  const block = /** @type {import('postcss').AtRule} */ (root.first);
  const [a, b] = /** @type {import('postcss').Rule[]} */ (block.nodes);
  const c = /** @type {import('postcss').Rule} */ (root.last.first);
  b.remove();
  index.detach(b);
  c.remove();
  block.append(c);
  index.repairMove(c);
  assert.equal(index.active.get(c).previous, a);
});

/**
 * Rules in the order the index links them, starting from the seeded head.
 *
 * @param {ReturnType<typeof createRuleIndex>} index
 * @param {import('postcss').Rule | null} head
 */
function linkedSelectors(index, head) {
  const selectors = [];
  for (let rule = head; rule; rule = index.active.get(rule).next)
    selectors.push(rule.selector);
  return selectors;
}

test('rule index lists rules in stylesheet order after moves into blocks nested in another block', () => {
  const root = postcss.parse(
    '@supports (x:y){@media print{.x{top:0}}@layer y;@media print{.z{top:0}}.w{top:0}.q{top:0}}' +
      '@supports (x:y){.v{top:0}.w2{top:0}}'
  );
  const rules = new Map();
  root.walkRules((rule) => rules.set(rule.selector, rule));
  const index = createRuleIndex(new WeakMap());
  const head = index.seed(root);
  const [firstSupports] = root.nodes;
  const [firstMedia] = firstSupports.nodes;
  for (const [moving, newParent] of [
    ['.v', firstMedia],
    ['.w2', firstSupports],
  ]) {
    const mover = rules.get(moving);
    mover.remove();
    newParent.append(mover);
    index.repairMove(mover);
  }
  const expected = [];
  root.walkRules((rule) => expected.push(rule.selector));
  assert.deepEqual(linkedSelectors(index, head), expected);
});
