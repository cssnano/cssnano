import { test } from 'node:test';
import preset from '../../../src/presets/advanced.js';
import { processCSSFactory } from '../../../../../util/testHelpers.js';

const { passthroughCSS } = processCSSFactory(
  preset({ disable: ['discardUnused'] })
);

test(
  'advanced preset keeps an unused @font-face when discardUnused is disabled',
  passthroughCSS('@font-face{src:url();font-family:a}')
);
