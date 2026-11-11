import { test } from 'node:test';
import { processCSSFactory } from '../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';

const mergeRules = processCSSFactory(transformPlugin('mergeRules'));
const discardDuplicates = processCSSFactory(
  transformPlugin('discardDuplicates')
);

// A declaration's identity is its value as written when that holds an important
// comment, so a value with an important comment differs from the same value
// without one. The comment must sit inside the value, before the `;`: after a
// value that ends the rule, PostCSS makes the comment a sibling node instead.

test(
  'rule merging does not merge a rule whose value has an important comment with one that lacks it',
  mergeRules.processCSS(
    'a{color:red/*!k*/;}b{color:red}',
    'a{color:red/*!k*/;}b{color:red}'
  )
);

test(
  'discarding duplicates keeps both declarations when only their important comments differ',
  discardDuplicates.processCSS(
    'a{color:red/*!k*/;}a{color:red/*!j*/;}',
    'a{color:red/*!k*/;}a{color:red/*!j*/;}'
  )
);

test(
  'rule merging still merges rules whose values carry the same important comment',
  mergeRules.processCSS(
    'a{color:red/*!k*/;}b{color:red/*!k*/;}',
    'a,b{color:red/*!k*/;}'
  )
);

test(
  'discarding duplicates still drops a repeated declaration without comments',
  discardDuplicates.processCSS('a{color:red}a{color:red}', 'a{color:red}')
);
