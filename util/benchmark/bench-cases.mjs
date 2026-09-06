// Focused, deterministic inputs for optimization areas where a full framework
// corpus cannot isolate the cost of one plugin.

import { fontCases } from './bench-cases-font.mjs';
import { mergeCases } from './bench-cases-merge.mjs';
import { normalizeCases } from './bench-cases-normalize.mjs';
import { orderedCases } from './bench-cases-ordered.mjs';
import { selectorCases } from './bench-cases-selectors.mjs';
import { stylehacksCases } from './bench-cases-stylehacks.mjs';

export const benchmarkCases = {
  ...fontCases,
  ...normalizeCases,
  ...selectorCases,
  ...orderedCases,
  ...mergeCases,
  ...stylehacksCases,
};
