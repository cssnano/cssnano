// Benchmark-only soundness check for the merge-longhand routing predicates.
//
// For every rule in the framework corpus, runs the legacy ungated merge order
// and the gated borders.merge() on identical explode() states and asserts both
// rule-level output equality and that no pass whose gate skipped it would
// have changed anything. Exit code 0 means the predicates skipped only
// no-ops; any mismatch prints the rule.
//
//   NODE_ENV=production node util/benchmark/merge-longhand-firing-vectors.mjs
//
// Never imported by production code.

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import borders from '../../packages/postcss-merge-longhand/src/lib/decl/borders.js';
import {
  cleanup,
  mergeBorderSpacing,
} from '../../packages/postcss-merge-longhand/src/lib/decl/borderLifecycle.js';
import {
  containsUnmergeableBorderDecls,
  hasBorderResetContext,
} from '../../packages/postcss-merge-longhand/src/lib/decl/borderValidation.js';
import {
  mergeComponentsToBorder,
  mergeComponentsToBorderAndSides,
  mergeSideComponentsToComponent,
  mergeSideComponentsToSide,
  mergeSidesToBorder,
  mergeSidesToComponents,
  rebindComponentCustomProp,
  rebindSideCustomProp,
} from '../../packages/postcss-merge-longhand/src/lib/decl/borderMerges.js';
import {
  hoistSubsumedComponents,
  mergeRedundantSweep,
  optimizeSides,
} from '../../packages/postcss-merge-longhand/src/lib/decl/borderFinalizers.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

const files = readdirSync(join(repoRoot, 'frameworks'))
  .filter((file) => file.endsWith('.css'))
  .toSorted();

let rulesChecked = 0;
let rulesChanged = 0;
let mismatches = 0;

const firingVectors = {
  mergeBorderSpacing: 0,
  mergeSideComponentsToSide: 0,
  mergeSideComponentsToComponent: 0,
  mergeSidesToComponents: 0,
  mergeComponentsToBorder: 0,
  mergeComponentsToBorderAndSides: 0,
  mergeSidesToBorder: 0,
  rebindSideCustomProp: 0,
  rebindComponentCustomProp: 0,
  optimizeSides: 0,
  mergeRedundantSweep: 0,
  hoistSubsumedComponents: 0,
  cleanup: 0,
};

function runPass(rule, name, fn) {
  const before = rule.toString();
  fn(rule);
  if (rule.toString() !== before) {
    firingVectors[name]++;
  }
}

function legacyMergeTracked(rule) {
  runPass(rule, 'mergeBorderSpacing', mergeBorderSpacing);
  if (containsUnmergeableBorderDecls(rule)) {
    return;
  }
  const canCreateBorder = hasBorderResetContext(rule);
  runPass(rule, 'mergeSideComponentsToSide', mergeSideComponentsToSide);
  runPass(
    rule,
    'mergeSideComponentsToComponent',
    mergeSideComponentsToComponent
  );
  runPass(rule, 'mergeSidesToComponents', mergeSidesToComponents);
  runPass(rule, 'mergeComponentsToBorder', (r) =>
    mergeComponentsToBorder(r, canCreateBorder)
  );
  runPass(rule, 'mergeComponentsToBorderAndSides', (r) =>
    mergeComponentsToBorderAndSides(r, canCreateBorder)
  );
  runPass(rule, 'mergeSidesToBorder', (r) =>
    mergeSidesToBorder(r, canCreateBorder)
  );
  runPass(rule, 'rebindSideCustomProp', rebindSideCustomProp);
  runPass(rule, 'rebindComponentCustomProp', rebindComponentCustomProp);
  runPass(rule, 'optimizeSides', optimizeSides);
  runPass(rule, 'mergeRedundantSweep', mergeRedundantSweep);
  runPass(rule, 'hoistSubsumedComponents', hoistSubsumedComponents);
  runPass(rule, 'cleanup', cleanup);
}

for (const file of files) {
  const source = readFileSync(join(repoRoot, 'frameworks', file), 'utf8');
  const root = postcss.parse(source);

  root.walkRules((rule) => {
    rulesChecked++;

    const legacy = postcss.parse(rule.toString()).first;
    const gated = postcss.parse(rule.toString()).first;

    borders.explode(legacy);
    legacyMergeTracked(legacy);

    borders.explode(gated);
    borders.merge(gated);

    const legacyOut = legacy.toString();
    const gatedOut = gated.toString();

    if (legacyOut !== gatedOut) {
      mismatches++;
      if (mismatches <= 5) {
        console.error(
          `MISMATCH in ${file}: ${rule.selector}\n  legacy: ${legacyOut}\n  gated : ${gatedOut}`
        );
      }
    } else if (legacyOut !== rule.toString()) {
      rulesChanged++;
    }
  });
}

console.log(
  `rules checked: ${rulesChecked}, rules changed by merge: ${rulesChanged}, mismatches: ${mismatches}`
);
console.log('firing vectors:', JSON.stringify(firingVectors, null, 2));
process.exitCode = mismatches === 0 ? 0 : 1;
