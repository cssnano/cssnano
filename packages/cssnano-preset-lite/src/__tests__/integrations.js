import { integrationTests, loadPreset } from '../../../../util/testHelpers.js';
import preset from '..';

jest.setTimeout(60000);

test(
  'should correctly handle the framework tests',
  integrationTests(preset, `${__dirname}/integrations`)
);