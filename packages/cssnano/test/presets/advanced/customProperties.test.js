import { test } from 'node:test';
import { processCSSWithPresetFactory } from '../../../../../util/integrationTestHelpers.js';
import preset from '../../../src/presets/advanced.js';

const { processCSS } = processCSSWithPresetFactory(preset);

test(
  'advanced preset minifies custom property values',
  processCSS(
    `:root{--a-var:'value';--c-var:calc(10px + 20px);--b-var: 12px;}`,
    ':root{--a-var:"value";--c-var:calc(30px);--b-var:12px}'
  )
);
