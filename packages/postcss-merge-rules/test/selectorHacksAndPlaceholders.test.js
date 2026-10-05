import nodepath from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { join } = nodepath;
const testDir = nodepath.dirname(fileURLToPath(import.meta.url));
const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should handle selector hacks',
  processCSS(
    '.classA{*zoom:1}.classB{box-sizing:border-box;position:relative;min-height:100%}.classC{box-sizing:border-box;position:relative}.classD{box-sizing:border-box;position:relative}',
    '.classA{*zoom:1}.classB{min-height:100%}.classB,.classC,.classD{box-sizing:border-box;position:relative}'
  )
);

test(
  'should merge ::placeholder selectors when supported',
  processCSS(
    '::placeholder{color:blue}h1{color:blue}',
    '::placeholder,h1{color:blue}',
    { overrideBrowserslist: 'Chrome 58' }
  )
);

test(
  'should not merge ::placeholder selectors based on Browserslist config [legacy] env',
  passthroughCSS('::placeholder{color:blue}h1{color:blue}', {
    from: join(testDir, 'browserslist/example.css'),
    env: 'legacy',
  })
);

test(
  'should not merge ::placeholder selectors based on Browserslist config [legacy] env using webpack file path',
  passthroughCSS('::placeholder{color:blue}h1{color:blue}', {
    file: join(testDir, 'browserslist/example.css'),
    env: 'legacy',
  })
);

test(
  'should not merge ::placeholder selectors based on Browserslist config [legacy] env using custom path',
  passthroughCSS('::placeholder{color:blue}h1{color:blue}', {
    path: join(testDir, 'browserslist'),
    env: 'legacy',
  })
);

test(
  'should merge ::placeholder selectors based on Browserslist config [modern] env',
  processCSS(
    '::placeholder{color:blue}h1{color:blue}',
    '::placeholder,h1{color:blue}',
    {
      from: join(testDir, 'browserslist/example.css'),
      env: 'modern',
    }
  )
);

test(
  'should merge ::placeholder selectors based on Browserslist config [modern] env using webpack file path',
  processCSS(
    '::placeholder{color:blue}h1{color:blue}',
    '::placeholder,h1{color:blue}',
    {
      file: join(testDir, 'browserslist/example.css'),
      env: 'modern',
    }
  )
);

test(
  'should merge ::placeholder selectors based on Browserslist config [modern] env using custom path',
  processCSS(
    '::placeholder{color:blue}h1{color:blue}',
    '::placeholder,h1{color:blue}',
    {
      path: join(testDir, 'browserslist'),
      env: 'modern',
    }
  )
);
