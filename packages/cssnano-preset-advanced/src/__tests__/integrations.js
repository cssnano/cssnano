import { integrationTests, loadPreset } from '../../../../util/testHelpers.js';
import preset from '..';

jest.setTimeout(60000);

test(
  'should correctly handle the framework tests',
  integrationTests(preset, `${__dirname}/integrations`)
);

function excludeProcessor(options) {
  const input = `h1{z-index:10}`;

  return () =>
    loadPreset(preset(options))
      .process(input, { from: undefined })
      .then(({ css }) => {
        expect(css).toBe(input);
      });
}

test('exclude zindex', excludeProcessor({ zindex: false }));

test('exclude zindex #1', excludeProcessor({ zindex: { exclude: true } }));
