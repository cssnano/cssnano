import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import postcss from 'postcss';

// Plugins that do not read browser targets. Their output must not need newer
// syntax or drop a fallback for some target, so the audit checks their output
// against the integration fixtures.
const plugins = [
  'discard-comments',
  'discard-duplicates',
  'discard-empty',
  'discard-overridden',
  'discard-unused',
  'merge-idents',
  'minify-font-values',
  'minify-gradients',
  'normalize-charset',
  'normalize-display-values',
  'normalize-positions',
  'normalize-repeat-style',
  'normalize-string',
  'normalize-timing-functions',
  'normalize-url',
  'normalize-whitespace',
  'ordered-values',
  'reduce-idents',
  'reduce-transforms',
  'unique-selectors',
  'zindex',
];

const fixtureDir = new URL(
  '../../test/presets/default/integrations/',
  import.meta.url
);
const fixtures = readdirSync(fixtureDir).filter((file) =>
  file.endsWith('.css')
);
const newerKeywords = new Set([
  'initial',
  'revert',
  'revert-layer',
  'unset',
  'inset',
  'fit-content',
  'min-content',
  'max-content',
  'flow-root',
  'subgrid',
  'auto-fill',
  'auto-fit',
  'currentcolor',
  'contents',
  'stretch',
  'logical',
]);

/** @param {string} css */
function tokens(css) {
  const set = new Set();
  for (const match of css.matchAll(/([a-zA-Z\-]+)\(/gv))
    set.add(`fn:${match[1].toLowerCase()}`);
  for (const match of css.matchAll(/@([a-zA-Z\-]+)/gv))
    set.add(`at:${match[1].toLowerCase()}`);
  for (const match of css.matchAll(/\b\d*\.?\d+(%|[a-zA-Z]{1,4})\b/gv))
    if (match[1]) set.add(`unit:${match[1].toLowerCase()}`);
  for (const match of css.matchAll(/[a-zA-Z][a-zA-Z\-]*/gv)) {
    const word = match[0].toLowerCase();
    if (newerKeywords.has(word)) set.add(`kw:${word}`);
  }
  return set;
}

describe('target-blind plugins add no newer syntax to the integration fixtures', () => {
  test('a function, at-rule, unit or keyword appears in output only when the input has it, except @charset', async () => {
    const added = [];
    for (const name of plugins) {
      const plugin = (
        await import(`../../src/plugins/postcss-${name}/index.js`)
      ).default;
      for (const file of fixtures) {
        const input = readFileSync(new URL(file, fixtureDir), 'utf8');
        const output = (
          await postcss([plugin({})]).process(input, { from: undefined })
        ).css;
        const before = tokens(input);
        for (const token of tokens(output)) {
          if (!before.has(token)) added.push(`${name} ${token} ${file}`);
        }
      }
    }
    // normalize-charset adds @charset, which every browser has parsed since CSS 2.1.
    const unexpected = added.filter((line) => !line.includes(' at:charset '));
    assert.deepEqual(unexpected, []);
  });
});

describe('target-blind plugins drop no fallback declaration', () => {
  test('a declaration is replaced by another value only in the intended renaming plugins', async () => {
    const replaced = new Set();
    for (const name of [
      'discard-overridden',
      'discard-duplicates',
      'discard-empty',
      'discard-unused',
      'merge-idents',
      'ordered-values',
      'minify-gradients',
      'minify-font-values',
      'normalize-positions',
      'normalize-display-values',
      'zindex',
      'reduce-transforms',
      'reduce-idents',
    ]) {
      const plugin = (
        await import(`../../src/plugins/postcss-${name}/index.js`)
      ).default;
      for (const file of fixtures) {
        if (
          await replacesValue(
            plugin,
            readFileSync(new URL(file, fixtureDir), 'utf8')
          )
        )
          replaced.add(name);
      }
    }
    // zindex renumbers integers and reduce-idents renames counters and keyframes;
    // neither removes a fallback.
    assert.deepEqual([...replaced].toSorted(), ['reduce-idents', 'zindex']);
  });
});

/**
 * Runs the plugin on each rule of the stylesheet on its own, so a removal can
 * only come from inside that rule's block.
 * @param {import('postcss').PluginCreator<any>} plugin
 * @param {string} css
 * @return {Promise<boolean>}
 */
async function replacesValue(plugin, css) {
  const rules = new Set();
  postcss.parse(css).walkRules((rule) => rules.add(rule.toString()));
  for (const text of rules) {
    if (text.length > 4000) continue;
    const output = (
      await postcss([plugin({})]).process(text, { from: undefined })
    ).css;
    if (
      replacedDeclaration(
        declarations(postcss.parse(text)),
        declarations(postcss.parse(output))
      )
    )
      return true;
  }
  return false;
}

/**
 * @param {Map<string, string[]>} before
 * @param {Map<string, string[]>} after
 * @return {boolean}
 */
function replacedDeclaration(before, after) {
  for (const [prop, values] of before) {
    const kept = after.get(prop) ?? [];
    if (kept.length > 0 && values.some((value) => !kept.includes(value)))
      return true;
  }
  return false;
}

/** @param {import('postcss').Root} root */
function declarations(root) {
  const map = new Map();
  root.walkDecls((decl) => {
    const prop = decl.prop.toLowerCase();
    if (!map.has(prop)) map.set(prop, []);
    map.get(prop).push(decl.value);
  });
  return map;
}
