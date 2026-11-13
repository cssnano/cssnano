import { declarationsOf } from '../../../../../src/passes/ir/blockChildren.js';
import assert from 'node:assert/strict';
import { buildTestRecords, nodeOfEntry } from './liveRecords.js';
import { test } from 'node:test';
import postcss from 'postcss';
import {
  filterRuleIntersections,
  intersect,
} from '../../../../../src/passes/ir/declarations.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import DeclarationScan from '../../../../../src/passes/merge/lib/rules/declarationScan.js';
import RuleSequence from '../../../../../src/passes/merge/lib/rules/ruleSequence.js';
import {
  earliestPairReaching,
  findGroup,
  SHARING_WINDOW,
} from '../../../../../src/passes/merge/lib/rules/sharedRuleGroup.js';
import { longSelector, sharedBackground } from './sharedRuleGroupFixtures.js';
import { declarationKeys } from '../../../../../src/passes/ir/declarationCache.js';

// Park-Miller generator: products stay below 2 ** 53, and the repository
// forbids bitwise operators.
/** @param {number} seed @return {() => number} */
function random(seed) {
  let state = seed * 7919 + 1;
  const next = () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
  // Small seeds start correlated, so the first draws are dropped.
  for (let i = 0; i < 8; i++) next();
  return next;
}

/** @param {string[]} rules */
const mediaBlock = (rules) => `@media (min-width:1px){${rules.join('')}}`;

// Long selectors make each rule that shares the declarations pay for itself,
// so groups grow to the window. Some rules omit or override the shared
// declarations, which ends or blocks a group. A preserved comment makes a
// rule unable to follow a pair, though it can still be the pair's second
// rule; equal blocks let a pair span two parents.
function stylesheet(seed, { comments = false, blocks = false } = {}) {
  const next = random(seed);
  const count = 4 + Math.floor(next() * 30);
  const rules = [];
  for (let i = 0; i < count; i++) {
    const roll = next();
    let body = `height:${i + 1}vw`;
    if (roll < 0.8) body = `${sharedBackground};${body}`;
    else if (roll < 0.9) body = `${sharedBackground};background-size:cover`;
    const comment = comments && next() < 0.2 ? '/*!k*/' : '';
    rules.push(`${longSelector(i)}{${comment}${body}}`);
  }
  if (!blocks) return rules.join('');
  const split = 1 + Math.floor(next() * (count - 1));
  return mediaBlock(rules.slice(0, split)) + mediaBlock(rules.slice(split));
}

/** @param {string} css */
function groupsOf(css) {
  const root = postcss.parse(css);
  const mergeState = new MergeState(['Chrome 120']);
  mergeState.records = buildTestRecords(root, mergeState);
  const sequence = new RuleSequence(mergeState.records);
  const scan = new DeclarationScan();
  /** @type {number[]} */
  const links = [];
  for (let link = sequence.head; link !== -1; link = sequence.nextOf(link)) {
    links.push(link);
  }
  const rule = (/** @type {number} */ index) => mergeState.records.rule(index);
  const found = [];
  for (const [i, first] of links.entries()) {
    const second = links[i + 1];
    if (second === undefined) break;
    const shared = intersect(
      declarationsOf(mergeState.records, rule(first).index),
      declarationKeys(mergeState.records, rule(second).index).keySet
    );
    if (shared.length === 0) continue;
    const { intersection, claimedIndices } = filterRuleIntersections(
      shared,
      [...declarationsOf(mergeState.records, rule(first).index)],
      [...declarationsOf(mergeState.records, rule(second).index)]
    );
    if (intersection.length === 0) continue;
    const sharedBytes = shared.reduce(
      (total, { prop, valueList }) =>
        total + prop.length + mergeState.tokenLists.textLength(valueList) + 2,
      0
    );
    const group = findGroup(
      rule(first),
      second,
      intersection,
      claimedIndices,
      sharedBytes,
      0,
      0,
      mergeState,
      sequence,
      scan
    );
    if (group) found.push({ i, group });
  }
  return { links, found, mergeState, sequence };
}

const seeds = Array.from({ length: 200 }, (_, i) => i + 1);

/**
 * Whether `earliestPairReaching`, from the last follower of each group that
 * `findGroup` forms, reaches the first rule of the group's pair.
 *
 * @param {{comments?: boolean, blocks?: boolean}} [options]
 */
function assertEveryGroupReached(options) {
  const scratch = [];
  for (const seed of seeds) {
    const { links, found, mergeState, sequence } = groupsOf(
      stylesheet(seed, options)
    );
    for (const { i, group } of found) {
      const last = links[i + 1 + group.followers.length];
      const earliest = { link: -1, distance: 0 };
      earliestPairReaching(
        sequence,
        last,
        links[i + 1],
        0,
        scratch,
        mergeState,
        earliest
      );
      const reached = links.indexOf(earliest.link);
      assert.ok(
        reached !== -1 && reached <= i,
        `seed ${seed}: the group of the pair at ${i} with ${group.followers.length} followers is not reached from its last follower`
      );
    }
  }
}

/**
 * The groups that `findGroup` forms in every generated stylesheet.
 *
 * @param {{comments?: boolean, blocks?: boolean}} [options]
 */
function allGroups(options) {
  return seeds.flatMap((seed) => {
    const { links, found, mergeState } = groupsOf(stylesheet(seed, options));
    return found.map(({ i, group }) => ({
      first: mergeState.records.rule(links[i]),
      second: mergeState.records.rule(links[i + 1]),
      group,
      records: mergeState.records,
    }));
  });
}

test('findGroup should form a group of the full sharing window in the generated stylesheets, so the property below covers the window edge', () => {
  const sizes = allGroups().map(({ group }) => group.followers.length);
  assert.equal(Math.max(...sizes), SHARING_WINDOW);
});

test('earliestPairReaching should reach the first rule of the pair from the last follower of every group findGroup forms', () => {
  assertEveryGroupReached();
});

test('findGroup should form a group whose second rule holds a comment in the generated stylesheets, so the property below covers that pair', () => {
  assert.ok(
    allGroups({ comments: true }).some(({ second, records }) =>
      nodeOfEntry(records, second).nodes.some((node) => node.type === 'comment')
    )
  );
});

test('earliestPairReaching should reach the first rule of a pair whose second rule holds a comment, since only the rules after the pair must hold declarations alone', () => {
  assertEveryGroupReached({ comments: true });
});

test('findGroup should form a group whose pair spans two equal blocks in the generated stylesheets, so the property below covers that pair', () => {
  assert.ok(
    allGroups({ blocks: true }).some(
      ({ first, second, records }) =>
        nodeOfEntry(records, first).parent !==
        nodeOfEntry(records, second).parent
    )
  );
});

test("earliestPairReaching should reach the first rule of a pair that stands in an earlier equal block, since only the rules after the pair share the follower's parent", () => {
  assertEveryGroupReached({ blocks: true });
});
