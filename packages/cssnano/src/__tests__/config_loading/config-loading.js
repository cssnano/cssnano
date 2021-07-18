import process from 'process';
import postcss from 'postcss';
import litePreset from 'cssnano-preset-lite';
import defaultPreset from 'cssnano-preset-default';
import cssnano from '../..';

/* The configuration is loaded relative to the current working directory,
  when running the repository tests, the working directory is 
  the repostiory root, so we need to change it to avoid having to place
  the configuration file for this test in the repo root */
const spy = jest.spyOn(process, 'cwd');
spy.mockReturnValue(__dirname);

test('should read the cssnano configuration file', () => {
  const processor = postcss([cssnano]);
  expect(processor.plugins.length).toBe(litePreset().plugins.length);
});

test('PostCSS config should override the cssnano config', () => {
  const processor = postcss([cssnano({ preset: 'default' })]);
  expect(processor.plugins.length).toBe(defaultPreset().plugins.length);
});
