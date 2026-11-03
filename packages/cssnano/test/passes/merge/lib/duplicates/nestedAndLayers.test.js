import { test } from 'node:test';
import { processCSSFactory } from '../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';

const plugin = transformPlugin('discardDuplicates');

const { processCSS } = processCSSFactory(plugin);

test(
  'should remove a repeated nested rule and keep the rule nesting the one that stays',
  processCSS(
    '.x{a{color:red}a{color:red}}.x{color:blue}',
    '.x{a{color:red}}.x{color:blue}'
  )
);

test(
  'should keep two equal conditional groups that each hold a named layer',
  processCSS(
    '@media print{@layer a{b{color:red}}}@media print{@layer a{b{color:red}}}',
    '@media print{@layer a{}}@media print{@layer a{b{color:red}}}'
  )
);
