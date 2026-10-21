import { test } from 'node:test';
import { processCSSFactory } from '../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';
const plugin = transformPlugin('discardDuplicates');

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

// These pin how two nodes compare today, so the linear rewrite keeps them.
// Non-conditional at-rules are used throughout: sibling @media blocks share a
// scope, which removes rules before the at-rule comparison runs.

test(
  'should keep a declaration that differs from a later one only by its * hack prefix',
  passthroughCSS('a{zoom:1}a{*zoom:1}')
);

test(
  'should compare at-rule children without the text of their comments',
  processCSS('@foo x{.a{x:1}/*a*/}@foo x{.a{x:1}/*b*/}', '@foo x{.a{x:1}/*b*/}')
);

test(
  'should compare comment-only at-rules without the text of their comments',
  processCSS('@foo x{/*a*/}@foo x{/*b*/}', '@foo x{/*b*/}')
);

test(
  'should compare nested rules by selector and declarations, not by the whitespace before them',
  processCSS('@foo x{ a{x:1}}@foo x{a{x:1}}', '@foo x{a{x:1}}')
);

test(
  'should keep at-rules whose names differ only by case because at-rule names compare case-sensitively',
  passthroughCSS('@Foo x{.a{x:1}}@foo x{.a{x:1}}')
);

test(
  'should keep nested declarations that differ only by !important',
  passthroughCSS('@foo x{.a{x:1}}@foo x{.a{x:1!important}}')
);

// Property names are ASCII case-insensitive, so `COLOR` and `color` are one
// property; custom properties are case-sensitive, so `--Foo` and `--foo` are not.
test(
  'should remove a declaration whose property name differs from a later one only by ASCII case',
  processCSS('a{color:red;COLOR:red}', 'a{COLOR:red}')
);

test(
  'should keep custom properties whose names differ only by case',
  passthroughCSS('a{--Foo:1;--foo:1}')
);

test(
  'should keep property names that differ by a non-ASCII letter, since only ASCII letters fold',
  passthroughCSS('a{coloſ:red;color:red}')
);

test(
  'should remove a declaration whose property name is an escaped spelling of a later one',
  processCSS('a{\\63olor:red;color:red}', 'a{color:red}')
);

test(
  'should remove a custom property whose name is an escaped spelling of a later one',
  processCSS('a{--\\61:1;--a:1}', 'a{--a:1}')
);
