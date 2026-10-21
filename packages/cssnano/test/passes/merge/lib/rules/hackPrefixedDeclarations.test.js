import { test } from 'node:test';
import { processCSSFactory } from '../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';
const plugin = transformPlugin('mergeRules');

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  // `_height` is a hack that only old Internet Explorer reads. A modern browser
  // ignores it, so merging it with `height` would apply `height` to `.a` too.
  'should keep a declaration with a leading underscore hack apart from the same property unprefixed',
  passthroughCSS('a{_height:1px}b{height:1px}')
);

test(
  // `*zoom` is read only by IE 7, so it stays apart from `zoom`. The shared
  // `color` still merges, since it is the same declaration on both rules.
  'should keep a declaration with a star hack apart from the same property unprefixed while merging the rest',
  processCSS(
    'a{*zoom:1;color:red}b{zoom:1;color:red}',
    'a{*zoom:1}a,b{color:red}b{zoom:1}'
  )
);

test(
  // The later `.a` rule would be redundant if `_height` counted as `height`.
  // Both declarations stay, in order, because the hack changes which one applies.
  'should keep a hacked and an unhacked declaration of one property when a same-selector rule joins them',
  processCSS(
    '.a{_height:1px}.b{width:1px}.a{height:1px}',
    '.a{_height:1px;height:1px}.b{width:1px}'
  )
);
