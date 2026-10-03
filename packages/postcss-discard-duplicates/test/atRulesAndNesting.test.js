import { test } from 'node:test';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should remove duplicate @rules',
  processCSS('@charset "utf-8";@charset "utf-8";', '@charset "utf-8";')
);

test(
  'should remove duplicate @rules (2)',
  processCSS(
    '@charset "utf-8";@charset "hello!";@charset "utf-8";',
    '@charset "hello!";@charset "utf-8";'
  )
);

test(
  'should remove duplicates inside @media queries',
  processCSS(
    '@media print{h1{display:block}h1{display:block}}',
    '@media print{h1{display:block}}'
  )
);

test(
  'should remove duplicate @media queries',
  processCSS(
    '@media print{h1{display:block}}@media print{h1{display:block}}',
    '@media print{h1{display:block}}'
  )
);

test(
  'should not mangle same keyframe rules but with different vendors',
  passthroughCSS(
    '@-webkit-keyframes flash{0%,50%,100%{opacity:1}25%,75%{opacity:0}}@keyframes flash{0%,50%,100%{opacity:1}25%,75%{opacity:0}}'
  )
);

test(
  'should not merge across keyframes',
  passthroughCSS(
    '@-webkit-keyframes test{0%{color:#000}to{color:#fff}}@keyframes test{0%{color:#000}to{color:#fff}}'
  )
);

test(
  'should not merge across keyframes (2)',
  passthroughCSS(
    '@-webkit-keyframes slideInDown{0%{-webkit-transform:translateY(-100%);transform:translateY(-100%);visibility:visible}to{-webkit-transform:translateY(0);transform:translateY(0)}}@keyframes slideInDown{0%{-webkit-transform:translateY(-100%);transform:translateY(-100%);visibility:visible}to{-webkit-transform:translateY(0);transform:translateY(0)}}'
  )
);

test(
  'should not crash on @layer syntax',
  processCSS(
    '@layer ui-components { } @layer ui-components',
    '@layer ui-components { } @layer ui-components'
  )
);

test(
  'should deduplicate duplicate declarations within @page rule',
  processCSS('@page{margin:1cm;margin:1cm}', '@page{margin:1cm}')
);

test(
  'should deduplicate declarations and nested rules within a parent rule',
  processCSS(
    '.card{color:red;color:red;.header{font-size:14px;font-size:14px;}}',
    '.card{color:red;.header{font-size:14px;}}'
  )
);

test(
  'should deduplicate at-rules whose inner rules contain duplicate declarations',
  processCSS(
    '@media print{h1{color:red;color:red}}@media print{h1{color:red}}',
    '@media print{h1{color:red}}'
  )
);

test(
  'should deduplicate empty at-rules without params or blocks',
  processCSS('@media;@media;', '@media;')
);

test(
  'should deduplicate identical unknown at-rules',
  processCSS('@unknown{color:red}@unknown{color:red}', '@unknown{color:red}')
);

test(
  'should retain earlier rule sharing selector when declarations are deduplicated but nested containers remain',
  processCSS(
    '.card{color:red;.inner{color:blue}}.card{color:red}',
    '.card{.inner{color:blue}}.card{color:red}'
  )
);

test(
  'should deduplicate duplicate nested rules within a parent rule',
  processCSS(
    '.card{.header{color:red}.header{color:red}}',
    '.card{.header{color:red}}'
  )
);

test(
  'should retain earlier rule sharing selector when declarations are deduplicated but nested at-rules remain',
  processCSS(
    '.card{color:red;@media print{color:blue}}.card{color:red}',
    '.card{@media print{color:blue}}.card{color:red}'
  )
);

test(
  'should deduplicate duplicate nested at-rules within a parent rule',
  processCSS(
    '.card{@media print{color:red}@media print{color:red}}',
    '.card{@media print{color:red}}'
  )
);

test(
  'should deduplicate duplicate nested rules across multiple nesting levels within a parent rule',
  processCSS(
    '.card{.inner{.leaf{color:red}.leaf{color:red}}}',
    '.card{.inner{.leaf{color:red}}}'
  )
);

test(
  'should retain earlier rule sharing selector with comments and nested containers after declarations are deduplicated',
  processCSS(
    '.card{/*note*/color:red;.inner{color:blue}}.card{color:red}',
    '.card{/*note*/.inner{color:blue}}.card{color:red}'
  )
);

test(
  'should deduplicate declarations surrounding a nested rule',
  processCSS(
    '.card{color:red;.inner{color:blue}color:red}',
    '.card{.inner{color:blue}color:red}'
  )
);

test(
  'should deduplicate duplicate empty nested rules within a container',
  processCSS('.card{.inner{}.inner{}}', '.card{.inner{}}')
);

test(
  'should deduplicate duplicate declarations within nested rules inside an at-rule',
  processCSS(
    '.card{@media print{.inner{color:red;color:red}}}',
    '.card{@media print{.inner{color:red}}}'
  )
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));

for (const prelude of [
  '@media (max-width:767px)',
  '@supports (display:grid)',
  '@container sidebar (min-width:400px)',
]) {
  test(
    `should remove an earlier declaration repeated in a sibling ${prelude.split(' ')[0]} with identical params`,
    processCSS(
      `${prelude}{#h{position:fixed}.a{display:none}}${prelude}{#h{position:fixed}.b{color:red}}`,
      `${prelude}{.a{display:none}}${prelude}{#h{position:fixed}.b{color:red}}`
    )
  );
}

test(
  'should remove an earlier declaration repeated in a sibling named @layer',
  processCSS(
    '@layer x{#h{position:fixed}.a{display:none}}@layer x{#h{position:fixed}.b{color:red}}',
    '@layer x{.a{display:none}}@layer x{#h{position:fixed}.b{color:red}}'
  )
);

test(
  'should remove an earlier declaration repeated in nested equivalent conditional contexts',
  processCSS(
    '@media (a){@supports (b){.x{c:1}.y{d:1}}}.z{e:1}@media (a){@supports (b){.x{c:1}}}',
    '@media (a){@supports (b){.y{d:1}}}.z{e:1}@media (a){@supports (b){.x{c:1}}}'
  )
);

test(
  'should not remove a declaration when sibling @media params differ because the blocks apply under different conditions',
  passthroughCSS(
    '@media (min-width:1px){#h{position:fixed}}@media (min-width:2px){#h{position:fixed}}'
  )
);

test(
  'should not remove a declaration when at-rule names differ despite equal params because the blocks apply under different conditions',
  passthroughCSS(
    '@media (min-width:1px){#h{position:fixed}}@container (min-width:1px){#h{position:fixed}}'
  )
);

test(
  'should not remove a declaration across anonymous @layer blocks because they are separate layers',
  passthroughCSS(
    '@layer{#h{position:fixed}.a{color:red}}@layer{#h{position:fixed}.b{color:red}}'
  )
);

test(
  'should not remove a declaration when !important differs because the cascade outcome changes',
  passthroughCSS(
    '@media (w){#h{position:fixed!important}}@media (w){#h{position:fixed}}'
  )
);

test(
  'should not remove a declaration inside an unknown at-rule because its semantics are not understood',
  passthroughCSS(
    '@unknown x{#h{position:fixed}.a{color:red}}@unknown x{#h{position:fixed}.b{color:red}}'
  )
);

test(
  'should remove an emptied earlier @supports block because an empty conditional group has no effect',
  processCSS(
    '@supports (display:grid){#h{position:fixed}}@supports (display:grid){#h{position:fixed}.b{color:red}}',
    '@supports (display:grid){#h{position:fixed}.b{color:red}}'
  )
);

test(
  'should remove an emptied earlier block nested in an equivalent conditional context',
  processCSS(
    '@media (a){@supports (b){.x{c:1}}}.z{e:1}@media (a){@supports (b){.x{c:1}.y{d:1}}}',
    '.z{e:1}@media (a){@supports (b){.x{c:1}.y{d:1}}}'
  )
);

test(
  'should remove an earlier declaration when a different value for the property sits between two identical conditional blocks',
  processCSS(
    '@media (w){.a{c:red}}.a{c:blue}@media (w){.a{c:red}}',
    '.a{c:blue}@media (w){.a{c:red}}'
  )
);

test(
  'should remove an earlier declaration repeated in a sibling conditional block nested in a rule',
  processCSS(
    '.p{@media (w){color:red;margin:0}@media (w){color:red}}',
    '.p{@media (w){margin:0}@media (w){color:red}}'
  )
);

test(
  'should keep an emptied named @layer block that precedes another layer because it fixes the layer order',
  processCSS(
    '@layer x{#h{position:fixed}}@layer y{.b{color:red}}@layer x{#h{position:fixed}}',
    '@layer x{}@layer y{.b{color:red}}@layer x{#h{position:fixed}}'
  )
);

test(
  'should not remove a declaration across anonymous @layer blocks nested in identical conditions',
  passthroughCSS(
    '@media (w){@layer{.a{x:1}}.b{y:1}}@media (w){@layer{.a{x:1}}}'
  )
);

test(
  'should keep the parent conditional block of an emptied named @layer because the layer order is fixed there',
  processCSS(
    '@media (w){@layer y{.a{x:1}}}@media (w){@layer y{.a{x:1}.b{z:1}}}',
    '@media (w){@layer y{}}@media (w){@layer y{.a{x:1}.b{z:1}}}'
  )
);

test(
  'should remove a declaration repeated across a chain of three identical blocks, keeping only the last',
  processCSS(
    '@media (w){.a{x:1}.b{y:1}}@media (w){.a{x:1}.c{y:1}}@media (w){.a{x:1}}',
    '@media (w){.b{y:1}}@media (w){.c{y:1}}@media (w){.a{x:1}}'
  )
);

test(
  'should treat at-rule names case-insensitively when matching conditions',
  processCSS(
    '@MEDIA (w){.a{x:1}.b{y:1}}@media (w){.a{x:1}}',
    '@MEDIA (w){.b{y:1}}@media (w){.a{x:1}}'
  )
);

test(
  'should keep an emptied @LAYER block because the at-rule keyword is case-insensitive and its first appearance fixes the order',
  processCSS(
    '@LAYER x{.a{x:1}}@layer y{.b{y:1}}@layer x{.a{x:1}}',
    '@LAYER x{}@layer y{.b{y:1}}@layer x{.a{x:1}}'
  )
);

test(
  'should keep an empty @LAYER statement block that fixes the layer order, regardless of name case',
  passthroughCSS('@LAYER x{}@layer y{}@LAYER x{}')
);

test(
  'should keep an emptied conditional block that holds a /*! comment because such comments are preserved on purpose',
  processCSS(
    '@media (w){/*!license*/.a{c:red}}@media (w){.a{c:red}}',
    '@media (w){/*!license*/}@media (w){.a{c:red}}'
  )
);

test(
  'should remove an emptied conditional block that holds only an ordinary comment',
  processCSS(
    '@media (w){/*note*/.a{c:red}}@media (w){.a{c:red}}',
    '@media (w){.a{c:red}}'
  )
);

test(
  'should keep a block whose named @layer was stripped to match a later identical block because removing it would move the layer after @layer z',
  processCSS(
    '@media (w){@layer y{.a{color:red}}}@layer z{.a{color:blue}}@media (w){@layer y{}}@media (w){@layer y{.a{color:red}.b{x:1}}}',
    '@media (w){@layer y{}}@layer z{.a{color:blue}}@media (w){@layer y{}}@media (w){@layer y{.a{color:red}.b{x:1}}}'
  )
);

test(
  'should keep an earlier identical block that declares a named @layer because its first appearance fixes the layer order',
  passthroughCSS('@media (w){@layer y{}}@layer z{}@media (w){@layer y{}}')
);

test(
  'should keep an ordinary rule that holds a /*! comment when its declarations are emptied because such comments are preserved on purpose',
  processCSS(
    '@media (w){.a{/*!keep*/x:1}.b{y:1}}@media (w){.a{x:1}.b{y:1}}',
    '@media (w){.a{/*!keep*/}}@media (w){.a{x:1}.b{y:1}}'
  )
);

test(
  'should not match @layer blocks whose names differ only by case because layer names are case-sensitive identifiers',
  passthroughCSS('@layer X{.a{x:1}.b{y:1}}@layer x{.a{x:1}}')
);

test(
  'should remove a declaration repeated in a sibling @container with the same query',
  processCSS(
    '@container (min-width:400px){.a{x:1}.b{y:1}}@container (min-width:400px){.a{x:1}}',
    '@container (min-width:400px){.b{y:1}}@container (min-width:400px){.a{x:1}}'
  )
);

test(
  'should match sibling conditions whose parameters differ only by a comment because the comment is not part of the condition',
  processCSS(
    '@media /*c*/ (w){.a{x:1}.b{y:1}}@media (w){.a{x:1}}',
    '@media /*c*/ (w){.b{y:1}}@media (w){.a{x:1}}'
  )
);

test(
  'should keep a duplicate @import with a layer() because removing the earlier one moves the layer after the next one in the layer order',
  passthroughCSS(
    '@import "a.css" layer(x);@import "b.css" layer(y);@import "a.css" layer(x);'
  )
);

test(
  'should keep a duplicate @import because the imported style sheet may declare layers that fix their order',
  passthroughCSS('@import "a.css";@import "b.css";@import "a.css";')
);
