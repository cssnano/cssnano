import { test } from 'uvu';
import { integrationTests } from '../../../../util/testHelpers.js';
import preset from '..';

test(
  'should correctly handle the framework tests',
  integrationTests(preset, `${__dirname}/integrations`)
);
test.run();
