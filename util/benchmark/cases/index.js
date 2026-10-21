// Focused, deterministic inputs for optimization areas where a full framework
// corpus cannot isolate the cost of one plugin.

import { commentCases } from './bench-cases-comments.js';
import { fontCases } from './bench-cases-font.js';
import { gradientCases } from './bench-cases-gradients.js';
import { mergeCases } from './bench-cases-merge.js';
import { normalizeCases } from './bench-cases-normalize.js';
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
};

// One authoritative mapping so snapshots and comparison artifacts record the
// same target metadata for the same case name.
export function resolveBenchmarkTarget(caseName) {
  if (!caseName) return 'cssnano';
  const benchmarkCase = benchmarkCases[caseName];
  if (!benchmarkCase) throw new Error(`unknown benchmark case "${caseName}"`);
  return benchmarkCase.plugin;
}
