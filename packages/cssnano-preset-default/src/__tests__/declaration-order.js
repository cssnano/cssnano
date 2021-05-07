import { processCSSWithPresetFactory } from '../../../../util/testHelpers';
import preset from '..';

const { passthroughCSS } = processCSSWithPresetFactory(preset);

test(
  'preserve order of border declarations',
  passthroughCSS('a{border-top:1px solid;border-color:purple}')
);

test(
  'preserve order of all declaration',
  passthroughCSS('button{all:unset;align-items:center}')
);
