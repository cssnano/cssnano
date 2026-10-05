import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should not merge nested rules',
  passthroughCSS('h1 { .a { color: red; } } h1 { .b { color: red; } }')
);

test(
  'should preserve nested rules when their parent also has matching declarations',
  passthroughCSS(
    '.a { & .child { color: blue; } color: red; } .b { color: red; }'
  )
);

// CSS Nesting keeps a declaration that follows nested rules in source order,
// so `&{color:red}color:blue;&{color:red}` ends red. Joining or moving either
// `&` rule across `color:blue` would make blue win.
test(
  'should keep equal nested rules apart across a declaration of the enclosing rule',
  passthroughCSS('.p{&{color:red}color:blue;&{color:red}}')
);

test(
  'should keep same-selector nested rules apart across a declaration of the enclosing rule',
  passthroughCSS('.p{&{color:red}color:blue;&{color:red;margin:0}}')
);

test(
  'should keep nested rules in equal @media blocks apart across a declaration of the enclosing rule',
  passthroughCSS(
    '.p{@media print{&{color:red}}color:blue;@media print{&{color:red;margin:0}}}'
  )
);

test(
  'should keep nested rules apart across a declaration in a nested @media block',
  passthroughCSS('.p{&{color:red}@media print{color:blue}&{color:red}}')
);

test(
  'should merge adjacent nested rules that no declaration of the enclosing rule separates',
  processCSS(
    '.p{.a{color:red}.b{color:red}color:blue}',
    '.p{.a,.b{color:red}color:blue}'
  )
);

test(
  'should merge nested rules in equal @media blocks that no declaration of the enclosing rule separates',
  processCSS(
    '.p{@media print{.a{color:red}}@media print{.b{color:red}}color:blue}',
    '.p{@media print{.a,.b{color:red}}color:blue}'
  )
);

test(
  'should merge nested rules in equal @media blocks when the enclosing rule declares only before the first block',
  processCSS(
    '.p{color:blue;@media print{.a{color:red}}@media print{.b{color:red}}}',
    '.p{color:blue;@media print{.a,.b{color:red}}}'
  )
);

test(
  'should keep nested rules in equal @media blocks apart across a declaration in a different @media block',
  passthroughCSS(
    '.p{@media print{.a{color:red}}@media screen{color:blue}@media print{.b{color:red}}}'
  )
);

test(
  'should not merge nested container rules',
  passthroughCSS(`.mobile {
  @container (min-width: 200px) {
     display: none;
  }
}

.notMobile {
  @container (max-width: 100px) {
     display: none;
  }
}`)
);
