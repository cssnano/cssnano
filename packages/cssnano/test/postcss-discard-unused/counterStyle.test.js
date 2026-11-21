import { test } from 'node:test';
import {
  processCSSFactory,
  presetEntryPlugin,
} from '../../../../util/testHelpers.js';
const plugin = presetEntryPlugin('discardUnused');

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should remove a counter style that only an unused counter style extends',
  processCSS(
    '@counter-style base{system:extends decimal}@counter-style custom{system:extends base;suffix:"| "}',
    ''
  )
);

test(
  'should remove a whole chain of unused counter styles in one run',
  processCSS(
    '@counter-style a{system:extends decimal}@counter-style b{system:extends a}@counter-style c{system:extends b}',
    ''
  )
);

test(
  'should keep a counter style that a used counter style extends through a chain',
  passthroughCSS(
    '@counter-style a{system:extends decimal}@counter-style b{system:extends a}a{list-style:b}'
  )
);

test(
  'should keep a counter style that a used counter style names as its fallback',
  passthroughCSS(
    '@counter-style base{system:cyclic;symbols:"*"}@counter-style b{system:fixed;symbols:"a";fallback:base}a{list-style:b}'
  )
);

test(
  'should keep a counter style that a used counter style names in speak-as',
  passthroughCSS(
    '@counter-style base{system:cyclic;symbols:"*"}@counter-style b{system:cyclic;symbols:"a";speak-as:base}a{list-style:b}'
  )
);

test(
  'should keep a counter style that counter() in content names',
  passthroughCSS(
    '@counter-style foo{system:cyclic;symbols:"*"}a::before{content:counter(c,foo)}'
  )
);

test(
  'should keep a counter style that counters() in content names as its last argument',
  passthroughCSS(
    '@counter-style foo{system:cyclic;symbols:"*"}a::before{content:"x" COUNTERS(c, ".", foo) "y"}'
  )
);

test(
  'should keep a counter style that target-counter() names as its third argument',
  passthroughCSS(
    '@counter-style foo{system:cyclic;symbols:"*"}a::after{content:target-counter(attr(href url),page,foo)}'
  )
);

test(
  'should keep a counter style that target-counters() names as its fourth argument',
  passthroughCSS(
    '@counter-style foo{system:cyclic;symbols:"*"}a::after{content:target-counters(attr(href url),section,".",foo)}'
  )
);

test(
  'should remove a counter style that target-counter() names only as its counter',
  processCSS(
    '@counter-style foo{system:cyclic;symbols:"*"}a::after{content:target-counter(attr(href url),foo)}',
    'a::after{content:target-counter(attr(href url),foo)}'
  )
);

test(
  'should keep a counter style that counter() in bookmark-label names',
  passthroughCSS(
    '@counter-style foo{system:cyclic;symbols:"*"}h1{bookmark-label:counter(c,foo)}'
  )
);

test(
  'should keep every counter style when list-style uses env(), whose value may name one',
  passthroughCSS(
    '@counter-style foo{system:cyclic;symbols:"*"}a{list-style:env(--s)}'
  )
);

test(
  'should keep every counter style when list-style uses a typed attr(), whose value may name one',
  passthroughCSS(
    '@counter-style foo{system:cyclic;symbols:"*"}li{list-style:attr(data-style type(<custom-ident>))}'
  )
);

test(
  'should keep every counter style when list-style uses attr() with the legacy ident type, whose value may name one',
  passthroughCSS(
    '@counter-style foo{system:cyclic;symbols:"*"}li{list-style:attr(data-style ident)}'
  )
);

test(
  'should remove an unused counter style when content uses an untyped attr(), which substitutes a string',
  processCSS(
    '@counter-style foo{system:cyclic;symbols:"*"}a::after{content:attr(data-label)}',
    'a::after{content:attr(data-label)}'
  )
);

test(
  'should keep a counter style that counter() names in the fallback of attr()',
  passthroughCSS(
    '@counter-style foo{system:cyclic;symbols:"*"}a::after{content:attr(data-label,counter(c,foo))}'
  )
);

test(
  'should keep every counter style when list-style uses attr() with a fallback, which may name one',
  passthroughCSS(
    '@counter-style foo{system:cyclic;symbols:"*"}li{list-style:attr(data-x,foo)}'
  )
);

test(
  'should keep every counter style when counter() takes its style from an attr() fallback',
  passthroughCSS(
    '@counter-style foo{system:cyclic;symbols:"*"}a::before{content:counter(c,attr(data-x,foo))}'
  )
);

test(
  'should keep an override of a predefined counter style that its name spells in uppercase',
  passthroughCSS(
    '@counter-style LOWER-ROMAN{system:extends decimal}ol{list-style:lower-roman}'
  )
);

test(
  'should keep an override of a predefined counter style that list-style spells in mixed case',
  passthroughCSS(
    '@counter-style lower-roman{system:extends decimal}ol{list-style:Lower-Roman}'
  )
);

test(
  'should keep an override of the predefined cjk-ideographic counter style that its name spells in uppercase',
  passthroughCSS(
    '@counter-style CJK-IDEOGRAPHIC{system:extends decimal}ol{list-style:cjk-ideographic}'
  )
);

test(
  'should remove a counter style whose author-defined name differs in case from the use',
  processCSS(
    '@counter-style Foo{system:cyclic;symbols:"*"}a{list-style:foo}',
    'a{list-style:foo}'
  )
);

test(
  'should keep a counter style that counter() names with an escape',
  passthroughCSS(
    '@counter-style foo{system:cyclic;symbols:"*"}a::before{content:counter(c,\\66oo)}'
  )
);

test(
  'should keep a counter style whose escaped name list-style spells plainly',
  passthroughCSS(
    '@counter-style \\66oo{system:cyclic;symbols:"*"}a{list-style:foo}'
  )
);

test(
  'should keep a counter style that a used counter style extends with an escape',
  passthroughCSS(
    '@counter-style base{system:cyclic;symbols:"*"}@counter-style b{system:extends \\62 ase}a{list-style:b}'
  )
);

test(
  'should remove a counter style that counter() in content does not name',
  processCSS(
    '@counter-style foo{system:cyclic;symbols:"*"}a::before{content:counter(foo)}',
    'a::before{content:counter(foo)}'
  )
);

test(
  'should keep a counter style that a used counter style extends and counter() names',
  passthroughCSS(
    '@counter-style base{system:cyclic;symbols:"*"}@counter-style foo{system:extends base}a::before{content:counter(c,foo)}'
  )
);

test(
  'should keep a counter style whose escaped name counter() spells in content',
  passthroughCSS(
    '@counter-style a\\ b{system:cyclic;symbols:"*"}x::before{content:counter(c,a\\ b)}'
  )
);

test(
  'should keep every counter style when content uses var(), whose value may name one',
  passthroughCSS(
    ':root{--n:counter(c,foo)}@counter-style foo{system:cyclic;symbols:"*"}a::before{content:var(--n)}'
  )
);

test(
  'should keep every counter style when list-style uses var(), whose value may name one',
  passthroughCSS(
    '@counter-style foo{system:cyclic;symbols:"*"}a{list-style:var(--s)}'
  )
);

test(
  'should keep every counter style when list-style-type uses var(), whose value may name one',
  passthroughCSS(
    '@counter-style foo{system:cyclic;symbols:"*"}a{list-style-type:var(--s)}'
  )
);

test(
  'should keep every counter style when counter() takes its style from var()',
  passthroughCSS(
    '@counter-style foo{system:cyclic;symbols:"*"}a::before{content:counter(c,var(--s))}'
  )
);

test(
  'should keep a counter style that fallback names outside every counter style',
  passthroughCSS(
    '@counter-style base{system:cyclic;symbols:"*"}@font-feature-values x{fallback:base}'
  )
);

test(
  'should remove an unused cycle of counter styles that extend each other',
  processCSS(
    '@counter-style a{system:extends b}@counter-style b{system:extends a}',
    ''
  )
);

test(
  'should keep both counter styles of a cycle that a rule uses',
  passthroughCSS(
    '@counter-style a{system:extends b}@counter-style b{system:extends a}a{list-style:a}'
  )
);

test(
  'should keep the base that two used counter styles both extend',
  passthroughCSS(
    '@counter-style base{system:cyclic;symbols:"*"}@counter-style b{system:extends base}@counter-style c{system:extends base}a{list-style:b}p{list-style:c}'
  )
);

test(
  'should follow the declarations of every counter style that shares a used name',
  passthroughCSS(
    '@counter-style base{system:cyclic;symbols:"*"}@counter-style b{system:cyclic;symbols:"a"}@counter-style b{system:extends base}a{list-style:b}'
  )
);
