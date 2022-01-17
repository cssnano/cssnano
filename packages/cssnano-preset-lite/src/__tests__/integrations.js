import { test } from 'uvu';
import { integrationTests } from '../../../../util/integrationTestHelpers.js';
import preset from '..';

test(
  'should correctly handle the framework tests',
  integrationTests(preset, `${__dirname}/integrations`)
);
test.run();
