import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should keep rules apart when the later declaration is !important and the earlier one is not, because the values differ in priority',
  passthroughCSS('.a{color:red}.x{height:1px}.b{color:red!important}')
);

test(
  'should keep rules apart when a shorthand in between resets the longhand of both',
  passthroughCSS('.a{margin-top:0}.x{margin:1px}.b{margin-top:0}')
);

test(
  'should keep rules apart when a logical property in between can map to the physical property of both',
  passthroughCSS(
    '.a{margin-left:0}.x{margin-inline-start:1px}.b{margin-left:0}'
  )
);

test(
  'should join declarations whose property names differ only in case, because property names are ASCII case-insensitive',
  processCSS(
    '.a{COLOR:red}.x{height:1px}.b{color:red}',
    '.a,.b{COLOR:red}.x{height:1px}'
  )
);

test(
  'should keep rules apart when custom property names differ in case, because custom property names are case-sensitive',
  passthroughCSS('.a{--A:1}.x{height:1px}.b{--a:1}')
);

test(
  'should keep rules apart when the later rule sets the longhand after a shorthand that the earlier rule lacks, because moving only the longhand would change the cascade',
  passthroughCSS(
    '.a{background-color:red}.x{height:1px}.c{background:blue;background-color:red}'
  )
);

test(
  'should join a chain of later rules into the earliest rule that shares a declaration',
  processCSS(
    '.a{color:red}.x{height:1px}.b{color:red}.y{width:1px}.c{color:red}',
    '.a,.b,.c{color:red}.x{height:1px}.y{width:1px}'
  )
);

test(
  'should keep an unprefixed group from absorbing a later ::-webkit-scrollbar rule, because merging would drop the unprefixed selectors from engines that reject the prefixed one',
  processCSS(
    '.a{color:red}.x{height:1px}.b{color:red}.y{height:2px}::-webkit-scrollbar{color:red}',
    '.a,.b{color:red}.x{height:1px}.y{height:2px}::-webkit-scrollbar{color:red}'
  )
);

test(
  'should let a -moz- group absorb a later -moz- rule with the same declarations, because both share one vendor prefix',
  processCSS(
    '::-moz-a{color:red}.x{height:1px}::-moz-b{color:red}',
    '::-moz-a,::-moz-b{color:red}.x{height:1px}'
  )
);

test(
  'should keep a -moz- group from absorbing a later unprefixed rule, because the prefixed selector would invalidate the whole list in other engines',
  passthroughCSS('::-moz-a{color:red}.x{height:1px}.b{color:red}')
);

test(
  'should keep a joined group from absorbing a later ::-ms-input-placeholder rule once the group lists :-ms-input-placeholder, because Edge and Internet Explorer spell the pseudo differently',
  processCSS(
    '::-ms-x{color:red}.x{height:1px}:-ms-input-placeholder{color:red}.y{height:2px}::-ms-input-placeholder{color:red}',
    '::-ms-x,:-ms-input-placeholder{color:red}.x{height:1px}.y{height:2px}::-ms-input-placeholder{color:red}'
  )
);

test(
  'should join rules inside @media and keep the rules that still hold declarations, because emptied rules are removed from their parent',
  processCSS(
    '@media screen{.a{color:red}.x{height:1px}.b{color:red}.y{width:1px}.c{color:red}}',
    '@media screen{.a,.b,.c{color:red}.x{height:1px}.y{width:1px}}'
  )
);

test(
  'should keep the position of a rule in @media that keeps declarations after the join, because the group stands at the first rule',
  processCSS(
    '@media screen{.a{color:red}.x{height:1px}.b{color:red;top:0}}',
    '@media screen{.a,.b{color:red}.x{height:1px}.b{top:0}}'
  )
);

test(
  'should write the joined selectors of a group that an earlier merge already listed, because the later passes rebuild its selector text',
  processCSS(
    '.a{color:red}.b{color:red}.x{height:1px}.c{color:red;top:0}.d{top:0}',
    '.a,.b,.c{color:red}.x{height:1px}.c,.d{top:0}'
  )
);
