import nodepath from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  processCSSFactory,
  withTargets,
} from '../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';
const plugin = transformPlugin('mergeRules');

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
    withTargets('Chrome 58')
  )
);

test(
  'should not merge ::placeholder selectors based on Browserslist config [legacy] env',
  passthroughCSS('::placeholder{color:blue}h1{color:blue}', {
    ...withTargets(undefined, { env: 'legacy' }),
    from: join(testDir, 'browserslist/example.css'),
  })
);

test(
  'should not merge ::placeholder selectors based on Browserslist config [legacy] env using webpack file path',
  passthroughCSS('::placeholder{color:blue}h1{color:blue}', {
    ...withTargets(undefined, { env: 'legacy' }),
    file: join(testDir, 'browserslist/example.css'),
  })
);

test(
  'should not merge ::placeholder selectors based on Browserslist config [legacy] env using custom path',
  passthroughCSS('::placeholder{color:blue}h1{color:blue}', {
    ...withTargets(undefined, { env: 'legacy' }),
    from: join(join(testDir, 'browserslist'), 'input.css'),
  })
);

test(
  'should merge ::placeholder selectors based on Browserslist config [modern] env',
  processCSS(
    '::placeholder{color:blue}h1{color:blue}',
    '::placeholder,h1{color:blue}',
    {
      ...withTargets(undefined, { env: 'modern' }),
      from: join(testDir, 'browserslist/example.css'),
    }
  )
);

test(
  'should merge ::placeholder selectors based on Browserslist config [modern] env using webpack file path',
  processCSS(
    '::placeholder{color:blue}h1{color:blue}',
    '::placeholder,h1{color:blue}',
    {
      ...withTargets(undefined, { env: 'modern' }),
      file: join(testDir, 'browserslist/example.css'),
    }
  )
);

test(
  'should merge ::placeholder selectors based on Browserslist config [modern] env using custom path',
  processCSS(
    '::placeholder{color:blue}h1{color:blue}',
    '::placeholder,h1{color:blue}',
    {
      ...withTargets(undefined, { env: 'modern' }),
      from: join(join(testDir, 'browserslist'), 'input.css'),
    }
  )
);
