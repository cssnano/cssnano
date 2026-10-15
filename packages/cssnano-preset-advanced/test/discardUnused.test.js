import { test } from 'node:test';
import { processCSSWithPresetFactory } from '../../../util/integrationTestHelpers.js';
import preset from '../src/index.js';

const { passthroughCSS } = processCSSWithPresetFactory(
  preset({ discardUnused: false })
);

test(
  'advanced preset keeps an unused @font-face when discardUnused is disabled',
  passthroughCSS('@font-face{src:url();font-family:a}')
);
