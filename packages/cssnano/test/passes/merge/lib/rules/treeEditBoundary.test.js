import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

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
