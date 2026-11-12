// The second longhand round reads and commits the records of each block. Its
// output must equal the node round's output on the same text, which the
// first round still runs on, so these tests pin the records round to it.
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import {
  canonicalize,
  finishColumns,
  longhandContext,
} from '../../../src/passes/merge/lib/longhand/canonicalize.js';
import { targetSupportOf } from '../../../src/passes/merge/lib/longhand/targetSupport.js';
import { TextTable } from '../../../src/values/textTable.js';
import { resolveTargets } from '../../../src/utils/browserTargets.js';
import { secondRoundOfText } from './lib/longhand/helpers/reduceRuns.js';
import {
  generateFamilyCases,
  generateResetCases,
} from '../../../script/passes/merge/rules/lib/mergeOracle.js';

const browsers = resolveTargets({}, undefined);

/**
 * The second round as the node round gives it: every block canonicalized on
 * its nodes, the root first, then the columns finished.
 *
 * @param {string} css
 * @return {string}
 */
function secondRoundOfNodes(css) {
  const root = postcss.parse(css);
  const { placeShorthands, boxSupport, pairShorthands, features } =
    targetSupportOf(browsers);
  const context = longhandContext(
    placeShorthands,
    boxSupport,
    pairShorthands,
    createRunContext(new TextTable(), undefined, features)
  );
  canonicalize(root, context);
  root.walk((node) => {
    if (node.type !== 'rule' && node.type !== 'atrule') return;
    if (!node.nodes?.some((child) => child.type === 'decl')) return;
    canonicalize(node, context);
  });
  finishColumns(context);
  return root.toString();
}

const parityInputs = [
  'a{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}',
  'a{margin:1px 1px 1px 1px}',
  'margin:0 0 0 0',
  '@media (a){.x{margin-right:1px;margin-left:1px}}@media (a){.y{margin-left:1px}}@media (a){.x{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}}',
  'a{margin-top:1px/*! keep */;margin-right:1px;margin-bottom:1px;margin-left:1px}',
  'a{margin-top:1px;/* plain */margin-right:1px;margin-bottom:1px;margin-left:1px}',
  'a{color:red;color:blue;COLOR:green}',
  'a{border-top-width:1px;border-top-style:solid;border-top-color:red}',
  '@page{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}',
  'a{margin-top:1px;margin-right:1px}b{margin-bottom:1px;margin-left:1px}a{margin-bottom:2px}',
  ...generateFamilyCases(0x11c, 120).map(({ css }) => css),
  ...generateResetCases(0x11c, 60).map(({ css }) => css),
];

for (const css of parityInputs) {
  test(`the second round on records gives the node round's text for ${css}`, () => {
    assert.strictEqual(
      secondRoundOfText(css, browsers),
      secondRoundOfNodes(css)
    );
  });
}

test('the second round shortens a declaration no removal touched, and write-back writes it', () => {
  assert.strictEqual(
    secondRoundOfText('a{margin:1px 1px 1px 1px}', browsers),
    'a{margin:1px}'
  );
});

test('the second round keeps a value with an important comment as written', () => {
  assert.match(
    secondRoundOfText(
      'a{margin-top:1px/*! keep */;margin-right:1px;margin-bottom:1px;margin-left:1px}',
      browsers
    ),
    /margin-top:1px\/\*! keep \*\//v
  );
});

test('the second round merges across a sibling comment, which ends no run', () => {
  assert.match(
    secondRoundOfText(
      'a{margin-top:1px;/* plain */margin-right:1px;margin-bottom:1px;margin-left:1px}',
      browsers
    ),
    /margin:1px/v
  );
});
