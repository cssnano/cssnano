import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { runDriver } from '../../../src/passes/ir/runDriver.js';

/** @import {DeclarationRecord} from '../../../src/passes/ir/declarationRecord.js' */

/**
 * The declaration records of the first rule of `css`, built under checks.
 *
 * @param {string} css
 * @return {DeclarationRecord[]}
 */
function declarationsOf(css) {
  const { records } = runDriver.build(
    postcss.parse(css),
    createRunContext(undefined, true)
  );
  const { links } = records;
  const declarations = [];
  const rule = links.firstChild(records.root.index);
  for (let at = links.firstChild(rule); at !== -1; at = links.nextSibling(at)) {
    declarations.push(/** @type {DeclarationRecord} */ (records.entry(at)));
  }
  return declarations;
}

describe('the build marks a value whose dropped comment holds non-ASCII text', () => {
  test('a value with a non-ASCII plain comment is marked, since its list drops the comment', () => {
    const [top] = declarationsOf('a{top:0 /*é*/;color:red}');
    assert.equal(top.writtenNonAscii, true);
  });

  test('a value with no comment is not marked', () => {
    const [, color] = declarationsOf('a{top:0 /*é*/;color:red}');
    assert.equal(color.writtenNonAscii, false);
  });

  test('a value whose comment is ASCII is not marked', () => {
    const [top] = declarationsOf('a{top:0 /*e*/}');
    assert.equal(top.writtenNonAscii, false);
  });
});
