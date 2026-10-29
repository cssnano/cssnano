#!/usr/bin/env node
// Prints how minify-selectors treats the distinct rule selectors of the
// framework corpus: the outcome rows, the unchanged shapes, and the lists
// that reach the fold.
//
//   node script/postcss-minify-selectors/outcomes.js [dir]
//
// `dir` defaults to the repository's frameworks directory. The script imports
// the plugin's modules and changes no source.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { normalizeNode } from '../../src/plugins/postcss-minify-selectors/lib/normalizeNode.js';
import { OutputPool } from '../../src/plugins/postcss-minify-selectors/lib/normalizePool.js';
import { parseSelectorArena } from '../../src/plugins/postcss-minify-selectors/lib/parseArena.js';
import { selectorCanFold } from '../../src/plugins/postcss-minify-selectors/lib/normalizeFoldSupport.js';
import { isFixedPointSelector } from '../../src/plugins/postcss-minify-selectors/lib/fixedPointSelector.js';
import { normalizeList } from '../../src/plugins/postcss-minify-selectors/lib/selectorScanner.js';

const defaultDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  'frameworks'
);

/**
 * Splits a selector list at top-level commas, so a comma inside `:is()`,
 * brackets or a string stays in its entry.
 *
 * @param {string} source
 * @returns {string[]}
 */
function splitList(source) {
  const entries = [];
  let depth = 0;
  let quote = '';
  let start = 0;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '\\') index++;
    else if (quote) {
      if (char === quote) quote = '';
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth--;
    else if (char === ',' && depth === 0) {
      entries.push(source.slice(start, index));
      start = index + 1;
    }
  }
  entries.push(source.slice(start));
  return entries;
}

/**
 * Collapses whitespace runs and drops the spaces around a comma or a
 * non-descendant combinator, so two spellings of one list compare equal.
 *
 * @param {string} source
 */
function squashWhitespace(source) {
  return source
    .replaceAll(/\s+/gv, ' ')
    .replaceAll(/ ?([,>+~]) ?/gv, '$1')
    .trim();
}

/**
 * True when a selector list is spelled with only the shapes the corpus counts
 * as plain: no comma, no combinator but the descendant space, and no
 * attribute, escape, universal selector, percentage or functional pseudo-class.
 *
 * @param {string} source
 */
function isPlainShape(source) {
  return !/[,>+~\[\\*\(%]/v.test(source);
}

/**
 * Normalizes a list the way `normalizeArena` does, and returns its arena and
 * the root's entries before they are finalized. Entries are null when the
 * root is not a list.
 *
 * @param {string} source
 */
function rootEntries(source) {
  const arena = parseSelectorArena(source, { verifyArena: false });
  if (arena.nodes.length === 0) return { arena, entries: null };
  const pool = new OutputPool(arena);
  /** @type {(import('../../src/plugins/postcss-minify-selectors/lib/normalizeNode.js').Normalized | undefined)[]} */
  const normalized = Array(arena.nodes.length);
  for (let nodeIndex = arena.nodes.length - 1; nodeIndex >= 0; nodeIndex--) {
    normalized[nodeIndex] = normalizeNode(
      arena,
      pool,
      nodeIndex,
      normalized,
      false
    );
    arena.forEachChild(nodeIndex, (child) => {
      normalized[child] = undefined;
    });
  }
  return { arena, entries: normalized[0]?.entries ?? null };
}

/**
 * Classifies each distinct selector into one outcome row and counts the lists
 * of two or more selectors that the fold precheck would see.
 *
 * @param {Iterable<string>} selectors
 */
export function countOutcomes(selectors) {
  const result = {
    distinct: 0,
    skipped: 0,
    unchanged: 0,
    whitespace: 0,
    sortOrDedupe: 0,
    other: 0,
    unchangedPlainShape: 0,
    multiListLists: 0,
    multiListReachingFold: 0,
    multiListFolding: 0,
  };
  for (const source of new Set(selectors)) {
    result.distinct++;
    if (isFixedPointSelector(source)) {
      result.skipped++;
      continue;
    }
    const normalized = normalizeList(source, true, true, false, false);
    if (normalized === source) {
      result.unchanged++;
      if (isPlainShape(source)) result.unchangedPlainShape++;
      continue;
    }
    if (squashWhitespace(normalized) === squashWhitespace(source)) {
      result.whitespace++;
      continue;
    }
    const sourceEntries = new Set(splitList(source).map(squashWhitespace));
    const normalizedEntries = new Set(
      splitList(normalized).map(squashWhitespace)
    );
    if (
      sourceEntries.size === normalizedEntries.size &&
      [...sourceEntries].every((entry) => normalizedEntries.has(entry))
    ) {
      result.sortOrDedupe++;
    } else {
      result.other++;
    }
  }
  return result;
}

/**
 * Counts, over every lists of two or more selectors in `selectors`, how many
 * have two eligible selectors and how many change when folded.
 *
 * @param {Iterable<string>} selectors
 */
export function countFoldLists(selectors) {
  const result = { lists: 0, reaching: 0, folding: 0 };
  for (const source of new Set(selectors)) {
    if (isFixedPointSelector(source) || splitList(source).length < 2) continue;
    result.lists++;
    const { arena, entries } = rootEntries(source);
    if (!entries) continue;
    const eligible = entries.filter((entry) => selectorCanFold(entry, arena));
    if (eligible.length < 2) continue;
    result.reaching++;
    if (
      normalizeList(source, true, true) !== normalizeList(source, true, false)
    )
      result.folding++;
  }
  return result;
}

/** @param {string} dir */
function corpusSelectors(dir) {
  /** @type {Map<string, Set<string>>} */ const byFile = new Map();
  for (const file of readdirSync(dir)
    .filter((name) => name.endsWith('.css'))
    .toSorted()) {
    const root = postcss.parse(readFileSync(join(dir, file), 'utf8'));
    const selectors = new Set();
    root.walkRules((rule) => {
      selectors.add(rule.selector);
    });
    byFile.set(file, selectors);
  }
  return byFile;
}

/**
 * Sums the counts of each stylesheet, so a selector that two files share is
 * counted once per file, as the outcome table is defined.
 *
 * @param {Map<string, Set<string>>} perFile
 */
function sumPerFile(perFile) {
  const outcomes = {};
  const folds = {};
  for (const selectors of perFile.values()) {
    for (const [key, value] of Object.entries(countOutcomes(selectors)))
      outcomes[key] = (outcomes[key] ?? 0) + value;
    for (const [key, value] of Object.entries(countFoldLists(selectors)))
      folds[key] = (folds[key] ?? 0) + value;
  }
  return { outcomes, folds };
}

function main() {
  const dir = process.argv[2] ?? defaultDir;
  const { outcomes, folds } = sumPerFile(corpusSelectors(dir));
  const rows = [
    ['skipped by isFixedPointSelector', outcomes.skipped],
    ['parsed and normalized, unchanged', outcomes.unchanged],
    ['changed: whitespace only', outcomes.whitespace],
    ['changed: sort or dedupe, maybe with whitespace', outcomes.sortOrDedupe],
    ['changed: anything else', outcomes.other],
  ];
  console.log(`distinct selectors (per file, summed): ${outcomes.distinct}`);
  for (const [label, count] of rows) console.log(`${label}: ${count}`);
  console.log(`unchanged, plain shape: ${outcomes.unchangedPlainShape}`);
  console.log(`lists of two or more selectors: ${folds.lists}`);
  console.log(`  reaching the fold (two eligible): ${folds.reaching}`);
  console.log(`  changed by folding: ${folds.folding}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
