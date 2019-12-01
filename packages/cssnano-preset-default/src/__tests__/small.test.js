import { processCSSWithPresetFactory } from '../../../../util/testHelpers.js';

const { processCSS: withDefaultPreset } = processCSSWithPresetFactory(
  'default'
);
test(
  'Check for the discarding of the duplicate',
  withDefaultPreset(
    '.cls{padding-top: 1rem;padding-top: calc(1rem + constant(safe-area-inset-top));padding-top: calc(1rem + env(safe-area-inset-top));}',
    '.cls{padding-top: 1rem;padding-top: calc(1rem + constant(safe-area-inset-top));padding-top: calc(1rem + env(safe-area-inset-top));}'
  )
);
