import test from 'ava';
import plugin from '..';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../../util/testHelpers';

const { processCSS } = processCSSFactory(plugin);

test(
  'should deduplicate selectors',
  processCSS,
  'h1,h1,h1,h1{color:red}',
  'h1{color:red}'
);

test(
  'should natural sort selectors',
  processCSS,
  'h1,h10,H2,h7{color:red}',
  'h1,H2,h7,h10{color:red}'
);

test('should use the postcss plugin api', usePostCSSPlugin, plugin());
