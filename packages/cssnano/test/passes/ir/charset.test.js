import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import charsetPlugin from '../../../src/plugins/postcss-normalize-charset/index.js';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { runDriver } from '../../../src/passes/ir/runDriver.js';
import {
  charsetVisit,
  createCharsetScan,
  decideCharset,
  rescanNonAscii,
} from '../../../src/passes/ir/charset.js';

/** @import {ArenaIndex} from '../../../src/passes/ir/blockRecord.js' */

/**
 * The charset plugin on the nodes.
 *
 * @param {string} css
 * @param {{add?: boolean}} [opts]
 * @return {string}
 */
function nodeForm(css, opts) {
  return postcss([charsetPlugin(opts)]).process(css, { from: undefined }).css;
}

/**
 * The charset decision on the records: build, scan in post-order, rescan,
 * decide, end, under checks.
 *
 * @param {string} css
 * @param {{add?: boolean}} [opts]
 * @return {{css: string, source: string | undefined}} the output, and the text the first node's source spans
 */
function recordsForm(css, opts = {}) {
  const root = postcss.parse(css);
  const context = createRunContext(undefined, true);
  const state = runDriver.build(root, context);
  const { records } = state;
  const scan = createCharsetScan(true);
  /** @param {ArenaIndex} index */
  const visit = (index) => {
    const { links } = records;
    for (let child = links.firstChild(index); child !== -1;) {
      const next = links.nextSibling(child);
      visit(child);
      child = next;
    }
    if (index !== records.root.index)
      charsetVisit(records, context, index, scan);
  };
  visit(records.root.index);
  rescanNonAscii(records, context, scan);
  decideCharset(records, context, scan, opts);
  runDriver.end(state, { browsers: [], folded: false });
  const { source } = /** @type {import('postcss').ChildNode} */ (root.first);
  return {
    css: root.toString(),
    source: source?.input.css.slice(source.start?.offset, source.end?.offset),
  };
}

const copyright = 'a{content:"©"}';

describe('the charset decision on the records gives the output of the node form', () => {
  const cases = /** @type {[string, string, {add?: boolean}?][]} */ ([
    ['an added charset', copyright],
    [
      'the first existing charset moves up',
      `b{жизнь:калька}@charset "windows-1251";${copyright}`,
    ],
    [
      'the separator after the first charset stays',
      `@charset "utf-8";\n${copyright}`,
    ],
    [
      'extra charsets go',
      `${copyright}@charset "utf-8";@charset "windows-1251";`,
    ],
    [
      'no charset without non-ASCII text',
      'a{content:"c"}@charset "utf-8";@charset "windows-1251";',
    ],
    ['add off adds none', copyright, { add: false }],
    [
      'the leading whitespace of a leading charset stays',
      `  \n@charset "a";\n\n\n${copyright}`,
    ],
    [
      'a charset from the middle takes its own whitespace',
      `\n\nb{x:y}\n@charset "a";\n\n\n${copyright}`,
    ],
    [
      'two leading charsets leave the separator of the second',
      `@charset "a";@charset "b";\n\n${copyright}`,
    ],
    ['an added charset before several rules', `\n\n  ${copyright}\n\n\nb{x:y}`],
    [
      'a charset after the non-ASCII rule',
      `\n\n  ${copyright}@charset "x";\nb{}`,
    ],
    ['non-ASCII text in a comment', '/*é*/a{b:c}'],
    ['non-ASCII text in a selector', 'é{b:c}'],
    ['non-ASCII text in a property', 'a{é:c}'],
    ['non-ASCII text in an at-rule prelude', '@media é{a{b:c}}'],
  ]);
  for (const [name, css, opts] of cases) {
    test(name, () => {
      assert.equal(recordsForm(css, opts).css, nodeForm(css, opts));
    });
  }
});

describe('the charset on the records', () => {
  test('a charset that is the first node takes the source of the first non-ASCII node', () => {
    const css = `b{жизнь:калька}@charset "windows-1251";${copyright}`;
    assert.equal(recordsForm(css).source, 'b{жизнь:калька}');
  });

  test('an added charset takes the source of the node with non-ASCII text', () => {
    assert.equal(recordsForm(copyright).source, copyright);
  });

  test('a charset in upper case is a charset', () => {
    assert.equal(
      recordsForm(`@CHARSET "utf-8";\n${copyright}`).css,
      `@charset "utf-8";\n${copyright}`
    );
  });

  test('a declaration whose dropped comment holds non-ASCII text counts', () => {
    assert.equal(
      recordsForm('a{top:0 /*é*/;color:red}', { add: true }).css,
      '@charset "utf-8";\na{top:0 /*é*/;color:red}'
    );
  });
});
