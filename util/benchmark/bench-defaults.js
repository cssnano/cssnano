// Normalized benchmark decision defaults. Kept dependency-free so provenance
// hashing can treat the effective configuration as data without importing the
// cssnano processor stack.

export const MODES = {
  quick: { warmup: 0, iters: 1, reliability: 'smoke' },
  stable: { warmup: 20, iters: 100, reliability: 'reliable' },
};

export const SUPERIORITY_CONFIDENCE_LEVEL = 0.95;
export const EQUIVALENCE_CONFIDENCE_LEVEL = 0.9;
export const RUNTIME_NON_REGRESSION_MARGIN = 1.1;
export const PRACTICAL_EQUIVALENCE_MARGIN = 1.1;
export const MINIMUM_BLOCKS = 6;
export const REQUESTED_BLOCKS = 20;
export const PRECISION_TARGET = 0.05;
export const ORDER_INTERACTION_THRESHOLD = 0.05;
export const INTER_BLOCK_COOLDOWN_MS = 100;
/** @deprecated Legacy bootstrap seed; unused by the modern v3 paired crossover analyzer. */
export const BOOTSTRAP_SEED = 'cssnano-benchmark-v3';
/** @deprecated Legacy bootstrap resamples; unused by the modern v3 paired crossover analyzer. */
export const BOOTSTRAP_RESAMPLES = 10_000;

// One canonical view of the defaults so provenance records which statistical
// configuration produced measurements, independent of file layout or comments.
export function benchmarkConfigurationDefaults() {
  return {
    equivalenceConfidenceLevel: EQUIVALENCE_CONFIDENCE_LEVEL,
    interBlockCooldownMs: INTER_BLOCK_COOLDOWN_MS,
    minimumBlocks: MINIMUM_BLOCKS,
    orderInteractionThreshold: ORDER_INTERACTION_THRESHOLD,
    practicalEquivalenceMargin: PRACTICAL_EQUIVALENCE_MARGIN,
    precisionTarget: PRECISION_TARGET,
    requestedBlocks: REQUESTED_BLOCKS,
    runtimeNonRegressionMargin: RUNTIME_NON_REGRESSION_MARGIN,
    superiorityConfidenceLevel: SUPERIORITY_CONFIDENCE_LEVEL,
  };
}

// Keep the hash input independent of CLI spelling and object insertion order.
// Only settings that can change the measured workload or its statistical
// interpretation belong in this identity; paths, labels, and output formats do
// not.
export function normalizeBenchmarkConfiguration(configuration = {}) {
  const mode = configuration.mode ?? 'stable';
  const modeDefaults = MODES[mode] ?? MODES.stable;
  const defaults = {
    adaptive: false,
    blocks: REQUESTED_BLOCKS,
    case: null,
    corpusSelector: null,
    equivalenceConfidenceLevel: EQUIVALENCE_CONFIDENCE_LEVEL,
    iters: modeDefaults.iters,
    interBlockCooldownMs: INTER_BLOCK_COOLDOWN_MS,
    minimumBlocks: MINIMUM_BLOCKS,
    mode,
    nodeEnv: 'production',
    orderInteractionThreshold: ORDER_INTERACTION_THRESHOLD,
    pinCore: null,
    pilotBlocks: 6,
    practicalEquivalenceMargin: PRACTICAL_EQUIVALENCE_MARGIN,
    precisionTarget: PRECISION_TARGET,
    preset: 'default',
    requestedBlocks: REQUESTED_BLOCKS,
    runtimeNonRegressionMargin: RUNTIME_NON_REGRESSION_MARGIN,
    seed: 'cssnano-benchmark-v3',
    superiorityConfidenceLevel: SUPERIORITY_CONFIDENCE_LEVEL,
    target: 'cssnano',
    warmup: modeDefaults.warmup,
  };
  const merged = { ...defaults, ...configuration, mode };
  let selectors = merged.corpusSelector;
  if (selectors === null || selectors === undefined) selectors = merged.only;
  let corpusSelector = null;
  if (Array.isArray(selectors)) corpusSelector = [...selectors];
  else if (selectors !== null && selectors !== undefined)
    corpusSelector = [selectors];
  return {
    ...merged,
    adaptive: Boolean(merged.adaptive),
    corpusSelector,
  };
}
