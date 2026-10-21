import { test } from 'node:test';
import { processCSSFactory } from '../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';
const plugin = transformPlugin('mergeRules');

const { passthroughCSS } = processCSSFactory(plugin);

// `\63olor` names `color`, so these are the same property. Each join below
// would move a declaration past one that overrides it, changing the computed
// style of an element that matches both rules.
test(
  'should keep a rule apart when an escaped spelling of its property is overridden by a later declaration in the same rule',
  passthroughCSS('.a{color:red}.b{\\63olor:blue;color:red}')
);

test(
  'should keep a rule apart when a later rule sets an escaped spelling of its property after a conflicting rule',
  passthroughCSS('.a{color:red}.b{color:blue}.a{\\63olor:green}')
);

// `\61 ll` names `all`, which resets `color` after the join point.
test(
  'should keep a rule apart when an escaped `all` resets the property of a later declaration',
  passthroughCSS('.a{color:red}.b{\\61 ll:initial;color:red}')
);

// `--\61` is the custom property `--a`, so `.c` must not move `--a:1` up past
// `.b`, which sets it to 2.
test(
  'should keep a custom property apart from an escaped spelling of the same name',
  passthroughCSS('.a{--a:1}.b{--\\61:2}.c{--a:1}')
);
