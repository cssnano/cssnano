import { integrationTests, loadPreset } from '../../../../util/testHelpers.js';
import preset from '..';

jest.setTimeout(20000);

test(
  'should correctly handle the framework tests',
  integrationTests(preset, `${__dirname}/integrations`)
);

function excludeProcessor(options) {
  const input = `h1{z-index:10}`;

  return () =>
    loadPreset(preset(options))
      .process(input)
      .then(({ css }) => {
        expect(css).toBe(input);
      });
}

test('exclude zindex', excludeProcessor({ zindex: false }));

test('exclude zindex #1', excludeProcessor({ zindex: { exclude: true } }));
