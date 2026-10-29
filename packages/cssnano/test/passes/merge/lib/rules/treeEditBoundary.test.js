import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import postcss from 'postcss';
import { mergePass } from '../../../../../src/passes/merge/index.js';
import { resolveTargets } from '../../../../../src/utils/browserTargets.js';

// The modules that may edit the live tree directly. Every other module in
// `lib/rules/` edits through `treeEdits.js`, which clears the caches an edit
// makes stale.
const rulesDirectory = new URL(
  '../../../../../src/passes/merge/lib/rules/',
  import.meta.url
);
const sources = readdirSync(rulesDirectory)
  .filter((name) => name.endsWith('.js') && name !== 'treeEdits.js')
  .map((name) => ({
    name,
    text: readFileSync(new URL(name, rulesDirectory), 'utf8'),
  }));

// `ruleRewrite.js` builds the clones `partialMerge` makes, which are not in the
// stylesheet yet, so it may edit them directly.
const cloneEditors = new Set(['ruleRewrite.js']);

const forbiddenImports = new Set([
  'invalidate',
  'detach',
  'insertAfter',
  'applyChildEdits',
]);

const forbiddenCall =
  /\.(remove|append|prepend|replaceWith|removeAll|insertBefore|insertAfter)\(/v;

test('lib/rules should have sources to check beyond treeEdits', () => {
  assert.ok(sources.length > 1);
});

test('lib/rules should import no tree-edit primitive other than through treeEdits', () => {
  const offenders = [];
  for (const { name, text } of sources) {
    for (const [, specifiers] of text.matchAll(
      /import\s*\{([^\}]*)\}\s*from/gv
    )) {
      for (const specifier of specifiers.split(',')) {
        if (forbiddenImports.has(specifier.trim())) {
          offenders.push(`${name}: ${specifier.trim()}`);
        }
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test('lib/rules should mark a rule departed only through treeEdits', () => {
  const offenders = sources
    .filter(
      ({ name, text }) => name !== 'ruleMeta.js' && text.includes('.depart(')
    )
    .map(({ name }) => name);
  assert.deepEqual(offenders, []);
});

test('lib/rules should mutate the child list only through treeEdits and clone editors', () => {
  const offenders = sources
    .filter(
      ({ name, text }) => !cloneEditors.has(name) && forbiddenCall.test(text)
    )
    .map(({ name }) => name);
  assert.deepEqual(offenders, []);
});

// Inputs that exercise every join: merges by declaration and by selector, moves
// across at-rules, nested rules and empty blocks.
const mergeInputs = [
  'a{color:red}b{color:red}',
  'a{color:red}b{color:blue}a{margin:0}',
  '.x{color:red;margin:0;.y{color:blue}}.x{color:red;padding:0}',
  '@media (width>1px){a{color:red}}b{color:blue}@media (width>1px){c{color:red}}',
  '@media print{a{color:red}}@media print{b{color:red}}',
  '@supports (display:grid){a{top:0}}a{top:0}@supports (display:grid){b{top:0}}',
  'a{color:red}@media print{}b{color:red}',
  '@media print{a{color:red;margin:0}}@media print{a{color:red;padding:0}}',
  'a{color:red;margin:0}b{color:red;padding:0}',
];

/**
 * A rule is a block exactly when it holds a rule or an at-rule, which is the
 * test `buildRecords` applies before the merge edits anything.
 *
 * @param {import('postcss').Container} node
 * @return {boolean}
 */
function isBlock(node) {
  return (
    node.type === 'root' ||
    (node.type === 'atrule' && node.nodes !== undefined) ||
    (node.type === 'rule' &&
      node.nodes.some((c) => c.type === 'rule' || c.type === 'atrule'))
  );
}

/**
 * Accessor pairs that report each read of a block's `nodes` or a rule's
 * `parent`, with the nearest file in `lib/rules/` on the stack. Reads from
 * outside `lib/rules/` report nothing.
 *
 * @param {import('postcss').Container | import('postcss').Root} node
 * @param {Set<string>} readers the files that read a boundary property
 * @return {void}
 */
function guardNodes(node, readers) {
  const report = () => {
    const match = /src\/passes\/merge\/lib\/rules\/([^\/:]+\.js):\d+/v.exec(
      new Error().stack ?? ''
    );
    if (match) readers.add(match[1]);
  };
  const guard = (target, property) => {
    let value = target[property];
    Object.defineProperty(target, property, {
      configurable: true,
      enumerable: true,
      get() {
        report();
        return value;
      },
      set(next) {
        value = next;
      },
    });
  };
  node.walk((child) => {
    if (child.type === 'decl') return;
    if (child.type !== 'root') guard(child, 'parent');
    if (isBlock(child) && child.type !== 'root') guard(child, 'nodes');
  });
  if (node.type === 'root') guard(node, 'nodes');
}

/**
 * Guards a stylesheet and every node that `clone` makes while the merge runs,
 * since partial joins build their rules from clones of the originals.
 *
 * @param {import('postcss').Root} root
 * @param {Set<string>} readers
 * @return {() => void} restores `clone`
 */
function guardBoundary(root, readers) {
  guardNodes(root, readers);
  const nodeProto = Object.getPrototypeOf(
    Object.getPrototypeOf(Object.getPrototypeOf(postcss.rule()))
  );
  const { clone } = nodeProto;
  nodeProto.clone = function guardedClone(...args) {
    const copy = clone.apply(this, args);
    guardNodes(copy, readers);
    return copy;
  };
  return () => {
    nodeProto.clone = clone;
  };
}

/**
 * The files in `lib/rules/` that read a block's children or a rule's parent
 * during the merge of every input.
 *
 * @return {string[]}
 */
function mergeReaders() {
  const readers = new Set();
  // The stack reaches past the postcss frames of a deep merge, so the reader
  // is the nearest `lib/rules/` file rather than the outermost one.
  const limit = Error.stackTraceLimit;
  Error.stackTraceLimit = 100;
  try {
    for (const css of mergeInputs) {
      const root = postcss.parse(css);
      const restore = guardBoundary(root, readers);
      try {
        mergePass(root, resolveTargets({}, undefined), {});
      } finally {
        restore();
      }
    }
  } finally {
    Error.stackTraceLimit = limit;
  }
  return [...readers].toSorted();
}

// The files still reading a block's children or a rule's parent. Each commit
// that moves a reader onto records removes it from this list.
const outsideReaders = [
  'declarationJoin.js',
  'lastWriteIndex.js',
  'nonAdjacentMerge.js',
  'ruleMeta.js',
  'ruleSequence.js',
];

test('the boundary guard should record reads from lib/rules during the merge', () => {
  assert.notDeepEqual(mergeReaders(), []);
});

test("lib/rules should read a block's children and a rule's parent only through treeEdits and blockRecords", () => {
  // A clone reads its source's `parent` only to skip it, so a clone editor's
  // read of a rule's parent does not reach the tree.
  const readers = mergeReaders().filter(
    (name) =>
      name !== 'treeEdits.js' &&
      name !== 'blockRecords.js' &&
      !cloneEditors.has(name)
  );
  assert.deepEqual(readers, outsideReaders);
});
