import { test } from 'node:test';
import preset from '../../../src/presets/advanced.js';
import { processCSSFactory } from '../../../../../util/testHelpers.js';

const { processCSS } = processCSSFactory(preset());

test(
  'advanced preset minifies custom property values',
  processCSS(
    `:root{--a-var:'value';--c-var:calc(10px + 20px);--b-var: 12px;}`,
    ':root{--a-var:"value";--c-var:calc(30px);--b-var:12px}'
  )
);
