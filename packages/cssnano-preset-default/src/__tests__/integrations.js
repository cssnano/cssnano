import test from 'ava';
import { integrationTests, loadPreset } from '../../../../util/testHelpers.js';
import preset from '..';

test(
  'should correctly handle the framework tests',
  integrationTests,
  preset,
  `${__dirname}/integrations`
);

function excludeProcessor(t, options) {
  const input = `h1{color:black}`;

  return loadPreset(preset(options))
    .process(input)
    .then(({ css }) => {
      t.is(css, input);
    });
}

test('exclude colormin', excludeProcessor, { colormin: false });

test('exclude colormin #1', excludeProcessor, { colormin: { exclude: true } });
