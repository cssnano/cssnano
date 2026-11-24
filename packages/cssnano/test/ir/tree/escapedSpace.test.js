import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../src/run/runContext.js';
import { buildRecords } from '../../../src/ir/tree/buildRecords.js';
import { writeBack } from '../../../src/ir/tree/writeBack.js';
import { tokensText } from '../../../src/values/tokensText.js';
import {
  escapedSpaceOf,
  trailingEscapedSpace,
} from '../../../src/ir/tree/escapedSpace.js';

/** @import {AtRule, Rule} from 'postcss' */

describe('escapedSpaceOf', () => {
  test('takes a space that a final backslash escapes', () => {
    assert.equal(escapedSpaceOf('.a\\', ' '), ' ');
  });

  test('takes a tab that a final backslash escapes', () => {
    assert.equal(escapedSpaceOf('.a\\', '\t'), '\t');
  });

  test('takes only the first character of the separator, which the escape consumes', () => {
    assert.equal(escapedSpaceOf('.a\\', '  \n'), ' ');
  });

  test('takes no newline, since a backslash before one is an invalid escape', () => {
    assert.equal(escapedSpaceOf('.a\\', '\n'), '');
  });

  test('takes no form feed, which CSS Syntax treats as a newline', () => {
    assert.equal(escapedSpaceOf('.a\\', '\f'), '');
  });

  test('takes nothing after an escaped backslash, which escapes nothing', () => {
    assert.equal(escapedSpaceOf('.a\\\\', ' '), '');
  });

  test('takes nothing from a head without a final backslash', () => {
    assert.equal(escapedSpaceOf('.a', ' '), '');
  });

  test('takes nothing from an empty separator', () => {
    assert.equal(escapedSpaceOf('.a\\', ''), '');
  });

  test('takes nothing from a node without a separator', () => {
    assert.equal(escapedSpaceOf('.a\\', undefined), '');
  });
});

describe('trailingEscapedSpace', () => {
  test('finds a final space that a backslash escapes', () => {
    assert.equal(trailingEscapedSpace('.a\\ '), ' ');
  });

  test('finds a final tab that a backslash escapes', () => {
    assert.equal(trailingEscapedSpace('.a\\\t'), '\t');
  });

  test('finds an escaped space that is the whole text', () => {
    assert.equal(trailingEscapedSpace('\\ '), ' ');
  });

  test('finds no space after an escaped backslash, which escapes nothing', () => {
    assert.equal(trailingEscapedSpace('.a\\\\ '), '');
  });

  test('finds no unescaped final space', () => {
    assert.equal(trailingEscapedSpace('.a '), '');
  });

  test('finds no escaped newline, which is an invalid escape', () => {
    assert.equal(trailingEscapedSpace('.a\\\n'), '');
  });

  test('finds nothing in an empty text', () => {
    assert.equal(trailingEscapedSpace(''), '');
  });
});

test('write-back finds exactly the character the build took into every short head', () => {
  // Every head of up to four characters from `a` and `\`, against every kind
  // of separator start: what the build appends, the write-back takes back.
  const heads = [''];
  for (let i = 0; heads[i].length < 4; i++) {
    heads.push(heads[i] + 'a', heads[i] + '\\');
  }
  const mismatches = [];
  for (const head of heads) {
    for (const between of [' ', '\t', '\n', 'x', '']) {
      const space = escapedSpaceOf(head, between);
      if (trailingEscapedSpace(head + space) !== space) {
        mismatches.push({ head, between });
      }
    }
  }
  assert.deepEqual(mismatches, []);
});

/**
 * The fields the build must leave as the parser set them.
 *
 * @param {Rule | AtRule} node
 * @return {object}
 */
function shapeOf(node) {
  return {
    selector: /** @type {Rule} */ (node).selector,
    params: /** @type {AtRule} */ (node).params,
    rawsSelector: node.raws.selector && { ...node.raws.selector },
    rawsParams: node.raws.params && { ...node.raws.params },
    between: node.raws.between,
  };
}

test('the record build leaves a rule with an escaped space as the parser set it', () => {
  const root = postcss.parse('.a\\ {top:0}');
  const before = shapeOf(root.first);
  buildRecords(root, createRunContext(true));
  assert.deepEqual(shapeOf(root.first), before);
});

test('the record build leaves an at-rule block with an escaped space as the parser set it', () => {
  const root = postcss.parse('@media x\\ {}');
  const before = shapeOf(root.first);
  buildRecords(root, createRunContext(true));
  assert.deepEqual(shapeOf(root.first), before);
});

test('the record build leaves an at-rule statement with an escaped space as the parser set it', () => {
  const root = postcss.parse('@layer a\\ ;');
  const before = shapeOf(root.first);
  buildRecords(root, createRunContext(true));
  assert.deepEqual(shapeOf(root.first), before);
});

test('the record of an at-rule statement holds the escaped space in its prelude', () => {
  const root = postcss.parse('@layer a\\ ;');
  const context = createRunContext(true);
  const { records } = buildRecords(root, context);
  const entry = records.entry(records.links.firstChild(records.root.index));
  assert.equal(
    tokensText(context.tokenLists.get(/** @type {number} */ (entry.preludeId))),
    'a\\ '
  );
});

test('the record of an at-rule statement keeps an empty separator once its escaped space is in the prelude', () => {
  const root = postcss.parse('@layer a\\ ;');
  const { records } = buildRecords(root, createRunContext(true));
  const entry = records.entry(records.links.firstChild(records.root.index));
  assert.equal(entry.between, '');
});

test('the record build leaves a rule whose raw holds a comment as the parser set it', () => {
  const root = postcss.parse('.a /*c*/ .b\\ {top:0}');
  assert.notEqual(root.first.raws.selector, undefined);
  const before = shapeOf(root.first);
  buildRecords(root, createRunContext(true));
  assert.deepEqual(shapeOf(root.first), before);
});

test('the record build leaves an at-rule block whose raw holds a comment as the parser set it', () => {
  const root = postcss.parse('@media x /*c*/ y\\ {}');
  assert.notEqual(root.first.raws.params, undefined);
  const before = shapeOf(root.first);
  buildRecords(root, createRunContext(true));
  assert.deepEqual(shapeOf(root.first), before);
});

test('write-back restores a rule with an escaped space to the parsed shape', () => {
  const css = '.a\\ {top:0}';
  const root = postcss.parse(css);
  const context = createRunContext(true);
  const { records, nodes } = buildRecords(root, context);
  writeBack(records, nodes, context.tokenLists);
  assert.equal(String(root), css);
  assert.equal(root.first.selector, '.a\\');
  assert.equal(root.first.raws.between, ' ');
});

test('write-back keeps the comment of a rule whose raw holds it and an escaped space', () => {
  const css = '.a /*c*/ .b\\ {top:0}';
  const root = postcss.parse(css);
  const context = createRunContext(true);
  const { records, nodes } = buildRecords(root, context);
  writeBack(records, nodes, context.tokenLists);
  assert.equal(String(root), css);
  assert.equal(root.first.selector, '.a  .b\\');
});

test('write-back restores an at-rule statement with an escaped space to the parsed shape', () => {
  const css = '@layer a\\ ;';
  const root = postcss.parse(css);
  const context = createRunContext(true);
  const { records, nodes } = buildRecords(root, context);
  writeBack(records, nodes, context.tokenLists);
  assert.equal(String(root), css);
  assert.equal(root.first.params, 'a\\');
  assert.equal(root.first.raws.between, ' ');
});
