import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { runDriver } from '../../../src/passes/ir/runDriver.js';
import { writtenTextHoldsNonAscii } from '../../../src/passes/ir/charset.js';

/** @import {DeclarationRecord} from '../../../src/passes/ir/declarationRecord.js' */

/**
 * The declaration records of the first rule of `css`, built under checks, with
 * the run context that reads their lists.
 *
 * @param {string} css
 * @return {{declarations: DeclarationRecord[], context: import('../../../src/passes/ir/runContext.js').RunContext}}
 */
function declarationsOf(css) {
  const context = createRunContext(true);
  const { records } = runDriver.build(postcss.parse(css), context);
  const { links } = records;
  const declarations = [];
  const rule = links.firstChild(records.root.index);
  for (let at = links.firstChild(rule); at !== -1; at = links.nextSibling(at)) {
    declarations.push(/** @type {DeclarationRecord} */ (records.entry(at)));
  }
  return { declarations, context };
}

describe('the charset decision detects non-ASCII text in a value as written', () => {
  test('a value with a non-ASCII plain comment is detected, since its list drops the comment', () => {
    const { declarations, context } = declarationsOf(
      'a{top:0 /*é*/;color:red}'
    );
    assert.equal(writtenTextHoldsNonAscii(context, declarations[0]), true);
  });

  test('a value with no comment is not detected', () => {
    const { declarations, context } = declarationsOf(
      'a{top:0 /*é*/;color:red}'
    );
    assert.equal(writtenTextHoldsNonAscii(context, declarations[1]), false);
  });

  test('a value whose comment is ASCII is not detected', () => {
    const { declarations, context } = declarationsOf('a{top:0 /*e*/}');
    assert.equal(writtenTextHoldsNonAscii(context, declarations[0]), false);
  });
});
