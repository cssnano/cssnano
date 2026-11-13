import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
// The counter must hook the tokenizer before any module below loads it.
const { counter } = await import('../../../../../../../util/countTokenize.js');
const { createRunContext } =
  await import('../../../../../src/passes/ir/runContext.js');
const { keysOfName } =
  await import('../../../../../src/passes/ir/propertyTable.js');
const { declarationKeys } =
  await import('../../../../../src/passes/ir/declarationCache.js');
const { declarationsOf } =
  await import('../../../../../src/passes/ir/blockChildren.js');
const { commitDeclarations } =
  await import('../../../../../src/passes/ir/arenaEdits.js');
const { declarationsFromRecords } =
  await import('../../../../../src/passes/merge/lib/longhand/recordDeclarations.js');
const { writeBack } = await import('../../../../../src/passes/ir/writeBack.js');
const { default: MergeState } =
  await import('../../../../../src/passes/merge/lib/rules/mergeState.js');
const { buildTestRecords, nodesOf, ruleRecordOf, tokenListsOf } =
  await import('./liveRecords.js');

/** @import {Container, Root} from 'postcss' */
/** @import {ArenaIndex} from '../../../../../src/passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../../../../../src/passes/ir/blockRecords.js' */

/**
 * The records of `css`, built with the checks on, and the run's state.
 *
 * @param {string} css
 * @param {boolean} [checks]
 * @return {{root: Root, state: MergeState, records: BlockRecords}}
 */
function setup(css, checks = true) {
  const root = postcss.parse(css);
  const context = createRunContext(checks);
  const state = new MergeState(['chrome 120'], context);
  state.records = buildTestRecords(root, state, checks);
  return { root, state, records: state.records };
}

/**
 * The arena index of the rule that is the `n`th child of the stylesheet, or
 * of the stylesheet when `n` is -1.
 *
 * @param {Root} root
 * @param {BlockRecords} records
 * @param {number} n
 * @return {ArenaIndex}
 */
function containerOf(root, records, n) {
  if (n === -1) return records.root.index;
  return ruleRecordOf(records, /** @type {Container} */ (root.nodes[n])).index;
}

/**
 * The arena indices of the declarations of the container, in chain order.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} container
 * @return {ArenaIndex[]}
 */
function declarationIndices(records, container) {
  return declarationsOf(records, container).map((record) => record.index);
}

/**
 * Reads the container, runs `edit` on its list and commits the list. Returns
 * the committed text of the stylesheet.
 *
 * @param {{root: Root, state: MergeState, records: BlockRecords}} setup
 * @param {ArenaIndex} container
 * @param {(list: import('../../../../../src/passes/merge/lib/longhand/blockDeclarations.js').BlockDeclarations) => void} edit
 * @return {string}
 */
function editAndWrite({ root, state, records }, container, edit) {
  const list = declarationsFromRecords(records, state.runContext, container);
  edit(list);
  commitDeclarations(records, state.runContext, container, list);
  writeBack(records, nodesOf(records), tokenListsOf(records));
  return String(root);
}

/**
 * Runs `commit` and returns the text of each tokenize call it made.
 *
 * @param {() => void} commit
 * @return {string[]}
 */
function tokenizedBy(commit) {
  const texts = [];
  const record = counter.record;
  counter.record = (input) => {
    texts.push(input.css);
    record.call(counter, input);
  };
  try {
    commit();
  } finally {
    counter.record = record;
  }
  return texts;
}

test('a rewrite of the value keeps the keys of the property', () => {
  const setupped = setup('a{color:red}');
  const { records } = setupped;
  const container = containerOf(setupped.root, records, 0);
  const [color] = declarationIndices(records, container);
  const keys = records.entry(color).keys;
  editAndWrite(setupped, container, (list) => list.rewrite(0, 'color', 'blue'));
  assert.deepEqual(records.entry(color).keys, keys);
});

test('a rewrite of the property moves the keys to the new property', () => {
  const setupped = setup('a{color:red}');
  const { records } = setupped;
  const container = containerOf(setupped.root, records, 0);
  const [color] = declarationIndices(records, container);
  editAndWrite(setupped, container, (list) =>
    list.rewrite(0, 'background-color', 'red')
  );
  assert.deepEqual(records.entry(color).keys, keysOfName('background-color'));
});

test('a rewritten declaration takes the id of an author-written declaration with the same text', () => {
  const setupped = setup('a{color:red}b{color:blue}');
  const { records } = setupped;
  const first = containerOf(setupped.root, records, 0);
  const second = containerOf(setupped.root, records, 1);
  const [rewritten] = declarationIndices(records, first);
  const [written] = declarationIndices(records, second);
  editAndWrite(setupped, first, (list) => list.rewrite(0, 'color', 'blue'));
  assert.equal(records.entry(rewritten).id, records.entry(written).id);
});

test('a rewrite keeps the hack before a declaration in its id', () => {
  const setupped = setup('a{*zoom:0}b{zoom:1}');
  const { records } = setupped;
  const starred = containerOf(setupped.root, records, 0);
  const plain = containerOf(setupped.root, records, 1);
  const [zoom] = declarationIndices(records, starred);
  const [other] = declarationIndices(records, plain);
  editAndWrite(setupped, starred, (list) => list.rewrite(0, 'zoom', '1'));
  assert.notEqual(records.entry(zoom).id, records.entry(other).id);
});

test('a commit with many rewrites moves the declaration stamp of its container once', () => {
  const setupped = setup('a{color:red;width:1px;height:2px}');
  const { records } = setupped;
  const container = containerOf(setupped.root, records, 0);
  declarationKeys(records, container);
  const before = records.declarations.rebuilds.keys.rebuilds;
  editAndWrite(setupped, container, (list) => {
    list.rewrite(0, 'color', 'blue');
    list.rewrite(1, 'width', '2px');
    list.rewrite(2, 'height', '3px');
  });
  declarationKeys(records, container);
  assert.equal(records.declarations.rebuilds.keys.rebuilds - before, 1);
});

test('a commit without an edit leaves the declaration stamp of its container as it was', () => {
  const setupped = setup('a{color:red;width:1px}');
  const { records } = setupped;
  const container = containerOf(setupped.root, records, 0);
  const stamp = records.declarationStamps.stampOf(container);
  commitDeclarations(
    records,
    setupped.state.runContext,
    container,
    declarationsFromRecords(records, setupped.state.runContext, container)
  );
  assert.equal(records.declarationStamps.stampOf(container), stamp);
});

test('a clone of a clone takes the template of the first clone source', () => {
  const setupped = setup('a{color:red}');
  const { records } = setupped;
  const container = containerOf(setupped.root, records, 0);
  const [source] = declarationIndices(records, container);
  editAndWrite(setupped, container, (list) => {
    const first = list.insertClone(0, {
      prop: 'margin',
      value: '0',
      important: false,
    });
    list.insertClone(first, { prop: 'padding', value: '0', important: false });
  });
  const [, margin, padding] = declarationIndices(records, container);
  assert.equal(records.entry(margin).template, source);
  assert.equal(records.entry(padding).template, source);
});

test('a clone of an author-written declaration takes that declaration as its template', () => {
  const setupped = setup('a{color:red}');
  const { records } = setupped;
  const container = containerOf(setupped.root, records, 0);
  const [source] = declarationIndices(records, container);
  editAndWrite(setupped, container, (list) =>
    list.insertClone(0, { prop: 'margin', value: '0', important: false })
  );
  const [, margin] = declarationIndices(records, container);
  assert.equal(records.entry(margin).template, source);
});

test('a clone is placed after its source, ahead of the clones the source had before it', () => {
  const setupped = setup('a{color:red;width:1px}');
  const text = editAndWrite(
    setupped,
    containerOf(setupped.root, setupped.records, 0),
    (list) => {
      list.insertClone(0, { prop: 'margin', value: '0', important: false });
      list.insertClone(0, { prop: 'padding', value: '0', important: false });
    }
  );
  assert.equal(text, 'a{color:red;padding:0;margin:0;width:1px}');
});

test('a removed source still fixes the place of its clone', () => {
  const setupped = setup('a{color:red;width:1px}');
  const text = editAndWrite(
    setupped,
    containerOf(setupped.root, setupped.records, 0),
    (list) => {
      list.insertClone(0, { prop: 'margin', value: '0', important: false });
      list.remove(0);
    }
  );
  assert.equal(text, 'a{margin:0;width:1px}');
});

test('a removed clone still fixes the place of the clone that its clone anchors', () => {
  const setupped = setup('a{color:red;width:1px}');
  const text = editAndWrite(
    setupped,
    containerOf(setupped.root, setupped.records, 0),
    (list) => {
      const margin = list.insertClone(0, {
        prop: 'margin',
        value: '0',
        important: false,
      });
      list.insertClone(margin, {
        prop: 'padding',
        value: '0',
        important: false,
      });
      list.remove(margin);
    }
  );
  assert.equal(text, 'a{color:red;padding:0;width:1px}');
});

test('a commit that rewrites and clones tokenizes no text', () => {
  const setupped = setup('a{color:red;width:1px}');
  const { records, state } = setupped;
  const container = containerOf(setupped.root, records, 0);
  const list = declarationsFromRecords(records, state.runContext, container);
  list.rewrite(0, 'color', 'blue');
  list.insertClone(1, { prop: 'margin', value: '0', important: false });
  const texts = tokenizedBy(() =>
    commitDeclarations(records, state.runContext, container, list)
  );
  assert.deepEqual(texts, []);
});

test('a checked read throws when a rewrite changes an id without touching the declarations', () => {
  const setupped = setup('a{color:red}');
  const { records, state } = setupped;
  const container = containerOf(setupped.root, records, 0);
  declarationKeys(records, container);
  const [color] = declarationIndices(records, container);
  const record = records.entry(color);
  record.id = state.runContext.declarations.keyOf(
    'color',
    state.runContext.valueIds.idOf(
      state.runContext.tokenLists,
      undefined,
      'blue'
    ),
    false,
    null
  );
  assert.throws(() => declarationKeys(records, container));
});

test('a checked commit throws when a declaration of the list has left its rule after the list was read', () => {
  const setupped = setup('a{color:red;width:1px}');
  const { records, state } = setupped;
  const container = containerOf(setupped.root, records, 0);
  const [color] = declarationIndices(records, container);
  const list = declarationsFromRecords(records, state.runContext, container);
  records.detach(color);
  list.rewrite(1, 'width', '2px');
  assert.throws(
    () => commitDeclarations(records, state.runContext, container, list),
    {
      message: 'a declaration is removed from a rule that does not hold it',
    }
  );
});

test('a commit of a block with no edit prints the input, comments included', () => {
  const setupped = setup('a{color:red/*x*/;width:1px}');
  const text = editAndWrite(
    setupped,
    containerOf(setupped.root, setupped.records, 0),
    () => {}
  );
  assert.equal(text, 'a{color:red/*x*/;width:1px}');
});

/* Committed edits must print what the same sequence of PostCSS `insertAfter`
 * and `remove` calls prints, so PostCSS itself is the oracle. */

const source = 'a{a:0;b:1; c:2;&{x:y}d:3;/* e */f:4;@media print{g:5}h:6}';

/**
 * Park–Miller minimal standard generator; every product stays below 2^53.
 *
 * @param {number} seed
 * @return {(bound: number) => number} an integer in [0, bound)
 */
function createRandom(seed) {
  let state = seed;
  return (bound) => {
    state = (state * 48271) % 2147483647;
    return state % bound;
  };
}

/**
 * @param {number} seed
 * @return {[string, string]} the committed and the PostCSS serializations
 */
function runEditSequence(seed) {
  const random = createRandom(seed);
  const expected = postcss.parse(source);
  const expectedRule = /** @type {import('postcss').Rule} */ (expected.first);
  const actualSetup = setup(source);
  const { root: actual, records, state } = actualSetup;
  const container = containerOf(actual, records, 0);
  const list = declarationsFromRecords(records, state.runContext, container);
  /** Corresponding attached declarations of both rules, by list position. */
  const attached = [];
  const declarations = expectedRule.nodes.filter(
    (node) => node.type === 'decl'
  );
  for (let position = 0; position < list.length; position++) {
    attached.push([declarations[position], position]);
  }
  for (let step = 0; step < 12 && attached.length > 0; step++) {
    const index = random(attached.length);
    const [expectedNode, position] = attached[index];
    if (random(2) === 0) {
      expectedNode.remove();
      list.remove(position);
      attached.splice(index, 1);
    } else {
      const change = {
        prop: `n${step}`,
        value: String(step),
        important: false,
      };
      const expectedClone = expectedNode.clone(change);
      const clonePosition = list.insertClone(position, change);
      expectedRule.insertAfter(expectedNode, expectedClone);
      attached.push([expectedClone, clonePosition]);
    }
  }
  commitDeclarations(records, state.runContext, container, list);
  writeBack(records, nodesOf(records), tokenListsOf(records));
  return [String(actual), String(expected)];
}

test('committed declaration edits print what the same PostCSS edits print', () => {
  for (let seed = 1; seed <= 500; seed++) {
    const [actual, expected] = runEditSequence(seed);
    assert.strictEqual(actual, expected, `seed ${seed}`);
  }
});
