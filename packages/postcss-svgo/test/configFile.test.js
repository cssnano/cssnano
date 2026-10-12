import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import postcss from 'postcss';
import { loadConfig } from 'svgo';
import { fileURLToPath } from 'node:url';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const configFile = join(fixtures, 'svgo.config.js');
const { processCSS } = processCSSFactory(plugin);

const input = `h1{background:url('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle r="4" fill="yellow"></circle></svg>')}`;
// svgo still runs with the fixture configuration, which only keeps the color.
const optimizedWithConfigFile = `h1{background:url('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle r="4" fill="yellow"/></svg>')}`;
const optimized = `h1{background:url('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle r="4" fill="%23ff0"/></svg>')}`;

test(
  'should read the svgo configuration from a configFile path',
  processCSS(input, optimizedWithConfigFile, { configFile })
);

test(
  'should resolve a relative configFile path against cwd',
  processCSS(input, optimizedWithConfigFile, {
    configFile: 'svgo.config.js',
    cwd: fixtures,
  })
);

test(
  'should discover svgo.config.js in the cwd when configFile is true',
  processCSS(input, optimizedWithConfigFile, {
    configFile: true,
    cwd: fixtures,
  })
);

test(
  'should let inline options override the configuration file',
  processCSS(input, optimized, {
    configFile,
    plugins: [{ name: 'preset-default' }],
  })
);

test(
  'should keep the configuration file plugins when the inline plugins option is undefined',
  processCSS(input, optimizedWithConfigFile, {
    configFile,
    plugins: undefined,
  })
);

test(
  'should ignore svgo.config.js when configFile is not set',
  processCSS(input, optimized, { cwd: fixtures })
);

test(
  'should ignore svgo command line settings such as datauri in the configuration file',
  processCSS(input, optimized, {
    configFile: join(fixtures, 'datauri.config.js'),
  })
);

test(
  'should ignore the datauri inline option, which only suits the svgo command line',
  processCSS(input, optimized, { datauri: 'base64' })
);

test(
  'should ignore the datauri inline option when a configuration file is read',
  processCSS(input, optimizedWithConfigFile, { configFile, datauri: 'base64' })
);

const prefixInput = `h1{background:url('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><g id="a"><path d="M0 0h1" fill="yellow"/></g></svg>')}`;
// prefixIds derives the prefix from the inline path; only that plugin runs here.
const optimizedWithPrefix = `h1{background:url('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><g id="arrow_svg__a"><path d="M0 0h1" fill="yellow"/></g></svg>')}`;

test(
  'should pass the inline path option to svgo plugins such as prefixIds',
  processCSS(prefixInput, optimizedWithPrefix, {
    plugins: [{ name: 'prefixIds' }],
    path: 'icons/arrow.svg',
  })
);

test('should use the default svgo preset when configFile is true and no svgo.config.js is found', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'postcss-svgo-'));
  try {
    // svgo searches every ancestor of cwd, so a config above tmpdir would be read.
    if (await loadConfig(null, directory)) {
      t.skip('an svgo.config.* file exists above the temporary directory');
      return;
    }
    const processor = postcss([plugin({ configFile: true, cwd: directory })]);
    const { css } = await processor.process(input, { from: undefined });
    assert.equal(css, optimized);
  } finally {
    await rm(directory, { recursive: true });
  }
});

test('should read the configuration file again after a syntax error is fixed', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'postcss-svgo-'));
  const file = join(directory, 'svgo.config.js');
  try {
    await writeFile(file, 'export default {');
    const processor = postcss([plugin({ configFile: file })]);
    await assert.rejects(processor.process(input, { from: undefined }));
    await writeFile(file, 'export default {};\n');
    const { css } = await processor.process(input, { from: undefined });
    assert.equal(css, optimized);
  } finally {
    await rm(directory, { recursive: true });
  }
});
