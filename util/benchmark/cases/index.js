// Focused, deterministic inputs for optimization areas where a full framework
// corpus cannot isolate the cost of one plugin.

import { commentCases } from './bench-cases-comments.js';
import { fontCases } from './bench-cases-font.js';
import { gradientCases } from './bench-cases-gradients.js';
import { mergeCases } from './bench-cases-merge.js';
import { normalizeCases } from './bench-cases-normalize.js';
import { presetCases } from './bench-cases-preset.js';
import { orderedCases } from './bench-cases-ordered.js';
import { selectorCases } from './bench-cases-selectors.js';
import { stylehacksCases } from './bench-cases-stylehacks.js';

export const benchmarkCases = {
  ...commentCases,
  ...fontCases,
  ...gradientCases,
  ...normalizeCases,
  ...selectorCases,
  ...orderedCases,
  ...mergeCases,
  ...stylehacksCases,
  ...presetCases,
};

// Named lists of cases that one command runs in turn on a single pair of
// worktrees, which saves the install of a run per case.
export const benchmarkSets = {
  // The cases step 9 of the merge IR plan reports.
  'merge-ir': Object.freeze([
    'merge-rules-dense',
    'merge-rules-nested-declarations',
    'merge-duplicates-dense',
    'merge-pass-duplicates',
  ]),
};
