import { test } from 'node:test';
import { processCSSFactory } from '../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';
const plugin = transformPlugin('mergeRules');

const { processCSS } = processCSSFactory(plugin);

// Text that only looks like `:host` or a mixin is not a selector, so it does
// not stop a merge. The compatibility scan decides for every real selector.

test(
  'should merge a rule whose attribute value holds :host',
  processCSS(
    '[title=":host"]{color:blue}h1{color:blue}',
    '[title=":host"],h1{color:blue}'
  )
);

test(
  'should merge a rule whose class name holds an escaped :host',
  processCSS('.a\\:host{color:blue}h1{color:blue}', '.a\\:host,h1{color:blue}')
);

test(
  'should merge a selector that ends in an escaped colon',
  processCSS('a\\:{color:blue}h1{color:blue}', 'a\\:,h1{color:blue}')
);

test(
  'should not merge a rule whose selector uses :host',
  processCSS(
    ':host{color:blue}h1{color:blue}',
    ':host{color:blue}h1{color:blue}'
  )
);

test(
  'should not merge a rule whose selector uses :host()',
  processCSS(
    ':host(.thing){color:blue}h1{color:blue}',
    ':host(.thing){color:blue}h1{color:blue}'
  )
);

test(
  'should not merge a rule whose selector uses :host-context()',
  processCSS(
    ':host-context(.thing){color:blue}h1{color:blue}',
    ':host-context(.thing){color:blue}h1{color:blue}'
  )
);

test(
  'should not merge a rule whose selector uses :HOST',
  processCSS(
    ':HOST{color:blue}h1{color:blue}',
    ':HOST{color:blue}h1{color:blue}'
  )
);

test(
  'should not merge a rule whose selector uses :\\68ost',
  processCSS(
    ':\\68ost{color:blue}h1{color:blue}',
    ':\\68ost{color:blue}h1{color:blue}'
  )
);

test(
  'should not merge a rule whose selector ends in a colon',
  processCSS(
    'paper-card:{color:blue}h1{color:blue}',
    'paper-card:{color:blue}h1{color:blue}'
  )
);
