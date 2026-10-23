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

const lengthRules = Array.from(
  { length: 2000 },
  (_, index) =>
    `.l-${index}{width:${index}.0px;margin:0px 1.50em;transition-duration:${index}00ms;opacity:1.${index % 9}}`
).join('');

const repeatRules = Array.from(
  { length: 2000 },
  (_, index) =>
    `.r-${index}{background-repeat:repeat no-repeat;mask-repeat:${index % 2 ? 'space round' : 'no-repeat'}}`
).join('');

const positionRules = Array.from(
  { length: 2000 },
  (_, index) =>
    `.p-${index}{background-position:left center;mask-position:${index % 2 ? 'top right' : 'center'};object-position:${index}px top}`
).join('');

const urlRules = Array.from(
  { length: 2000 },
  (_, index) =>
    `.u-${index}{background:url("img/${index}.png");mask:url(${index % 2 ? '"a b.png"' : 'a.svg'})}`
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
  'preset-default-length-values': {
    plugin: 'cssnano',
    createProcessor: () => postcss(defaultPreset()),
    css: lengthRules,
  },
  'preset-default-repeat-style-values': {
    plugin: 'cssnano',
    createProcessor: () => postcss(defaultPreset()),
    css: repeatRules,
  },
  'preset-default-position-values': {
    plugin: 'cssnano',
    createProcessor: () => postcss(defaultPreset()),
    css: positionRules,
  },
  'preset-default-url-values': {
    plugin: 'cssnano',
    createProcessor: () => postcss(defaultPreset()),
    css: urlRules,
  },
};
