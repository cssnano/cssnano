// Focused, deterministic inputs for optimization areas where a full framework
// corpus cannot isolate the cost of one plugin.

import { commentCases } from './bench-cases-comments.mjs';
import { fontCases } from './bench-cases-font.mjs';
import { gradientCases } from './bench-cases-gradients.mjs';
import { mergeCases } from './bench-cases-merge.mjs';
import { normalizeCases } from './bench-cases-normalize.mjs';
import { orderedCases } from './bench-cases-ordered.mjs';
import { selectorCases } from './bench-cases-selectors.mjs';
import { stylehacksCases } from './bench-cases-stylehacks.mjs';

export const benchmarkCases = {
  ...commentCases,
  ...fontCases,
  ...gradientCases,
  ...normalizeCases,
  ...selectorCases,
  ...orderedCases,
  ...mergeCases,
  ...stylehacksCases,
};

// One authoritative mapping so snapshots and comparison artifacts record the
// same target metadata for the same case name.
export function resolveBenchmarkTarget(caseName) {
  if (!caseName) return 'cssnano';
  const benchmarkCase = benchmarkCases[caseName];
  if (!benchmarkCase) throw new Error(`unknown benchmark case "${caseName}"`);
  return benchmarkCase.plugin;
}
