import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../src/passes/ir/consistencyChecks.js';
import { mergePass } from '../../../src/passes/merge/index.js';
import { resolveTargets } from '../../../src/utils/browserTargets.js';

// The merged records check their declarations against the tree at each read,
// so a record left stale by the handoff throws during the pass.
before(() => enableConsistencyChecks(true));
after(() => enableConsistencyChecks(false));

// In the joined @media (y), the forward pass moves the `a` rule down past the
// first @media (z), so the backward pass hands the second @media (z) up to the
// first, whose summary the next forward pass reads.
test('mergePass joins a block that a backward pass hands up with the block above it, in cascade order', () => {
  const root = postcss.parse(
    '@media (y){@media (z){a{color:red}}a{color:blue;width:1px}}@media (y){@media (z){b{width:1px}a{margin:0}}a{margin:0}@media (z){a{color:blue}}}'
  );
  mergePass(root, resolveTargets({}, undefined));
  assert.equal(
    root.toString(),
    '@media (y){@media (z){a{color:red;margin:0}b{width:1px}}a{color:blue;width:1px;margin:0}@media (z){a{color:blue}}}'
  );
});
