import { selectorIdsOf } from '../merge/lib/rules/selectorIdsOf.js';
import { SelectorIds } from '../../../src/passes/ir/selectorIds.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { remove } from '../../../src/passes/ir/treeEdits.js';
import {
  buildRecords,
  recordDeclaration,
} from '../../../src/passes/ir/buildRecords.js';
import { TextTable } from '../../../src/values/textTable.js';
import { RuleRecord } from '../../../src/passes/ir/ruleRecord.js';
import { placeUnlinked } from '../merge/lib/rules/liveRecords.js';
import { TokenLists } from '../../../src/passes/ir/tokenLists.js';

const selectorIds = new SelectorIds();
const tokenLists = new TokenLists();

/**
 * @param {string} css one declaration
 * @return {import('postcss').Declaration}
 */
function declarationOf(css) {
  return /** @type {import('postcss').Declaration} */ (
    postcss.parse(`a{${css}}`).first.first
  );
}

test('should assign a declaration the same key in a second run as a fresh run does', () => {
  const first = createRunContext();
  recordDeclaration(declarationOf('color:red'), first);
  recordDeclaration(declarationOf('width:1px'), first);

  const second = createRunContext();
  const fresh = createRunContext();
  assert.equal(
    recordDeclaration(declarationOf('height:1px'), second).id,
    recordDeclaration(declarationOf('height:1px'), fresh).id
  );
});

test('a second run gets a fresh value table, so a value of the first run is pushed again', () => {
  const first = createRunContext();
  recordDeclaration(declarationOf('color:red'), first);

  const second = createRunContext();
  recordDeclaration(declarationOf('color:red'), second);
  assert.equal(second.tokenLists.length, 1);
});

test('a run context created with consistency checks makes a link into a removed rule throw', () => {
  const context = createRunContext(new TextTable(), true);
  const { records } = buildRecords(postcss.parse('a{color:red}'), context);
  const rule = records.rule(records.links.firstChild(records.root.index));
  remove(records, rule.index);
  const entry = placeUnlinked(
    records,
    records.root.index,
    new RuleRecord('', selectorIdsOf(selectorIds, tokenLists, ['x']))
  );
  assert.throws(() => records.moveLast(rule.index, entry.index));
});
