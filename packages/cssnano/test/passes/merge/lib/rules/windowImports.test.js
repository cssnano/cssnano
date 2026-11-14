import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '../../../../../src');

/**
 * Files the window reaches that may import postcss at runtime: the build, the
 * write-back and the checks, which are the only code that sees a node.
 */
const UNWALKED = new Set([
  'passes/ir/writeBack.js',
  'passes/ir/nodeTable.js',
  'passes/ir/writeSelector.js',
  'passes/ir/treeMatch.js',
  'passes/ir/buildRecords.js',
]);

/**
 * The module specifiers a file imports or re-exports at runtime, which the
 * JSDoc type imports of a file do not count as.
 *
 * @param {string} text
 * @return {string[]}
 */
function runtimeSpecifiersOf(text) {
  /** @type {string[]} */
  const specifiers = [];
  for (const match of text.matchAll(
    /^\s*(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gmv
  )) {
    specifiers.push(match[1] ?? match[2]);
  }
  return specifiers;
}

/**
 * Walks the runtime imports of the entry files, under `src`. A bare specifier
 * is a leaf, so only relative imports are followed.
 *
 * @param {string[]} entries paths relative to `src`
 * @return {{ visited: Set<string>, postcss: string[] }} the files reached, and
 *   each import of postcss that one of them makes
 */
function reachFrom(entries) {
  /** @type {Set<string>} */
  const visited = new Set();
  /** @type {string[]} */
  const postcss = [];
  /** @type {string[]} */
  const stack = [...entries];
  while (stack.length) {
    const file = /** @type {string} */ (stack.pop());
    if (visited.has(file)) continue;
    visited.add(file);
    const text = readFileSync(join(SRC, file), 'utf8');
    for (const specifier of runtimeSpecifiersOf(text)) {
      if (specifier === 'postcss' || specifier.startsWith('postcss/')) {
        postcss.push(`${file}: ${specifier}`);
      } else if (specifier.startsWith('.')) {
        const next = normalize(join(dirname(file), specifier));
        if (!UNWALKED.has(next)) stack.push(next);
      }
    }
  }
  return { visited, postcss };
}

test('the runtime imports of the rule merge reach no postcss', () => {
  const { visited, postcss } = reachFrom([
    'passes/merge/lib/rules/selectorMerger.js',
    'passes/merge/lib/duplicates/discardDuplicates.js',
  ]);
  assert.ok(visited.has('passes/merge/lib/rules/ruleRewrite.js'));
  assert.deepEqual(postcss, []);
});
