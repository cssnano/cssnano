// Preset-level inputs for the value stages that run as one host plugin. Each
// rule has colour and timing values that the stages rewrite, so the cases
// measure the preset's whole pass over them. The preset is built from the
// same module on both revisions, so these cases compare them.

import { createRequire } from 'node:module';
import postcss from 'postcss';

const require = createRequire(import.meta.url);
// The module exports its preset as module.exports, which require returns.
const defaultPreset = require('../../../packages/cssnano/src/presets/default.js');

const colourRules = Array.from(
  { length: 2000 },
  (_, index) =>
    `.c-${index}{color:#ffffff;background:rgb(0 0 0 / 50%);border-color:hsl(120,100%,50%);outline-color:transparent}`
).join('');

const timingRules = Array.from(
  { length: 2000 },
  (_, index) =>
    `.t-${index}{transition:opacity ${index}ms cubic-bezier(0.42,0,0.58,1);animation-timing-function:cubic-bezier(0,0,1,1)}`
).join('');

const calcRules = Array.from(
  { length: 2000 },
  (_, index) =>
    `.k-${index}{width:calc(${index}px + 2px);height:calc(100% - ${index % 9}px)}`
).join('');

export const presetCases = {
  'preset-default-colour-values': {
    plugin: 'cssnano',
    createProcessor: () => postcss(defaultPreset()),
    css: colourRules,
  },
  'preset-default-timing-values': {
    plugin: 'cssnano',
    createProcessor: () => postcss(defaultPreset()),
    css: timingRules,
  },
  'preset-default-calc-values': {
    plugin: 'cssnano',
    createProcessor: () => postcss(defaultPreset()),
    css: calcRules,
  },
};
