import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should not match a Unicode lookalike keyframes at-rule',
  passthroughCSS('@Keyframes a{0%{color:#fff}}@Keyframes b{0%{color:#fff}}')
);

test(
  'should handle duplication within media queries',
  passthroughCSS(
    [
      '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
      '@media (max-width:400px){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
      '.spin{animation:1s spin infinite linear}',
    ].join('')
  )
);

test(
  'should handle duplication within supports rules',
  passthroughCSS(
    [
      '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
      '@supports (transform:rotate(0deg)){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
      '.spin{animation:1s spin infinite linear}',
    ].join('')
  )
);

test(
  'should handle duplication within supports rules & media queries',
  passthroughCSS(
    [
      '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
      '@media (max-width:400px){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
      '@supports (transform:rotate(0deg)){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
      '.spin{animation:1s spin infinite linear}',
    ].join('')
  )
);

test(
  'should handle duplication within nested at-rules',
  passthroughCSS(
    [
      '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
      '@media (max-width:400px){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
      '@supports (transform:rotate(0deg)){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
      '@media (max-width: 400px){@supports (transform:rotate(0deg)){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}}',
      '.spin{animation:1s spin infinite linear}',
    ].join('')
  )
);

test(
  'should merge identical keyframes within the same media query',
  processCSS(
    '@media (max-width:400px){@keyframes a{0%{opacity:0}to{opacity:1}}@keyframes b{0%{opacity:0}to{opacity:1}}}',
    '@media (max-width:400px){@keyframes b{0%{opacity:0}to{opacity:1}}}'
  )
);

// `a` has two bodies, so the media block decides which one applies: neither
// `a` nor `b` can be renamed.
test(
  'should not merge a name that has another body outside the conditional rule',
  passthroughCSS(
    '@media (max-width:400px){@keyframes a{from{top:0}to{top:10px}}@keyframes b{from{top:0}to{top:10px}}}div{animation:a 1s}@keyframes a{from{left:0}to{left:100px}}'
  )
);

test(
  'should reject multi-token at-rules and not merge them',
  passthroughCSS(
    '@keyframes a{0%{opacity:0}}@keyframes b extra{0%{opacity:0}}div{animation:a 1s}'
  )
);

test(
  'should reject non-ident and non-string tokens in at-rules',
  passthroughCSS(
    '@keyframes a{0%{opacity:0}}@keyframes 123{0%{opacity:0}}div{animation:a 1s}'
  )
);

test(
  'should reject empty or comments-only parameters in keyframes at-rules',
  passthroughCSS(
    '@keyframes {0%{opacity:0}}@keyframes /* comment */ {0%{opacity:0}}'
  )
);

test(
  'should reject reserved keyword none as keyframes name',
  passthroughCSS(
    '@keyframes a{0%{opacity:0}}@keyframes none{0%{opacity:0}}div{animation:a 1s}'
  )
);

test(
  'should reject CSS-wide keywords as keyframes names',
  passthroughCSS(
    '@keyframes a{0%{opacity:0}}@keyframes inherit{0%{opacity:0}}@keyframes initial{0%{opacity:0}}@keyframes unset{0%{opacity:0}}@keyframes revert{0%{opacity:0}}@keyframes revert-layer{0%{opacity:0}}div{animation:a 1s}'
  )
);

// The media block redefines `a`, so `a` has two bodies and keeps its name.
test(
  'should not merge a name that a conditional rule redefines with another body',
  passthroughCSS(
    '@keyframes a{0%{opacity:0}}@keyframes b{0%{opacity:0}}@media (min-width:600px){@keyframes a{0%{opacity:1}}div{animation:a 1s}}'
  )
);

// The media block redefines `b`, so renaming `a` to `b` would pick up the
// other body whenever the media query matches.
test(
  'should not rename a reference to a name that a conditional rule redefines',
  passthroughCSS(
    '@keyframes a{0%{opacity:0}}@keyframes b{0%{opacity:0}}@media (min-width:600px){@keyframes b{0%{opacity:1}}div{animation:a 1s}}'
  )
);

test(
  'should resolve keyframes across cascade layers',
  processCSS(
    '@layer base{@keyframes a{0%{opacity:0}to{opacity:1}}@keyframes b{0%{opacity:0}to{opacity:1}}}div{animation:a 1s}',
    '@layer base{@keyframes b{0%{opacity:0}to{opacity:1}}}div{animation:b 1s}'
  )
);

test(
  'should resolve keyframes defined across different cascade layers',
  processCSS(
    '@layer base{@keyframes a{0%{opacity:0}to{opacity:1}}}@layer components{@keyframes b{0%{opacity:0}to{opacity:1}}}div{animation:a 1s}',
    '@layer base{}@layer components{@keyframes b{0%{opacity:0}to{opacity:1}}}div{animation:b 1s}'
  )
);

test(
  'should order nested layer names within their parent layer when merging',
  processCSS(
    '@layer l{@layer m{@keyframes a{0%{opacity:0}}}}@layer k{@keyframes a{0%{opacity:0}}}@layer m{@keyframes a{0%{opacity:0}}}div{animation:a 1s}',
    '@layer l{@layer m{}}@layer k{}@layer m{@keyframes a{0%{opacity:0}}}div{animation:a 1s}'
  )
);

test(
  'should keep escaped-dot layer names distinct from dotted nesting when ordering',
  processCSS(
    '@layer a\\.b{@keyframes k{0%{opacity:0}}}@layer c{@keyframes k{0%{opacity:0}}}@layer b{@keyframes k{0%{opacity:0}}}div{animation:k 1s}',
    '@layer a\\.b{}@layer c{}@layer b{@keyframes k{0%{opacity:0}}}div{animation:k 1s}'
  )
);

test(
  'should merge keyframes within identical escaped-dot layer names',
  processCSS(
    '@layer a\\.b{@keyframes a{0%{opacity:0}}}@layer a\\.b{@keyframes b{0%{opacity:0}}}div{animation:a 1s}',
    '@layer a\\.b{}@layer a\\.b{@keyframes b{0%{opacity:0}}}div{animation:b 1s}'
  )
);

test(
  'should preserve higher priority layer when conflicting layer order is declared',
  processCSS(
    '@layer low, high;@layer high{@keyframes a{0%{opacity:0}}}@layer low{@keyframes a{0%{opacity:0}}}div{animation:a 1s}',
    '@layer low, high;@layer high{@keyframes a{0%{opacity:0}}}@layer low{}div{animation:a 1s}'
  )
);

test(
  'should prefer unlayered keyframes over layered keyframes regardless of order',
  processCSS(
    '@keyframes a{0%{opacity:0}}@layer low{@keyframes a{0%{opacity:0}}}div{animation:a 1s}',
    '@keyframes a{0%{opacity:0}}@layer low{}div{animation:a 1s}'
  )
);

test(
  'should handle duplication within container queries',
  processCSS(
    '@container (min-width:400px){@keyframes a{0%{opacity:0}}@keyframes b{0%{opacity:0}}div{animation:a 1s}}',
    '@container (min-width:400px){@keyframes b{0%{opacity:0}}div{animation:b 1s}}'
  )
);

// `a` has two bodies, so the container query decides which one applies.
test(
  'should not merge a name that has another body outside the container query',
  passthroughCSS(
    '@container (min-width:400px){@keyframes a{from{top:0}to{top:10px}}@keyframes b{from{top:0}to{top:10px}}}div{animation:a 1s}@keyframes a{from{left:0}to{left:100px}}'
  )
);

const X = 'from{top:0}';
const Y = 'from{top:1px}';
const M = '(min-width:600px)';

// Keyframes names are global: a condition only decides whether a definition
// takes part, and the last applicable definition wins.
test(
  'should not remove a name whose replacement is redefined in a conditional rule that holds the reference',
  passthroughCSS(
    `@keyframes a{${X}}@keyframes b{${X}}@media ${M}{@keyframes b{${Y}}div{animation:a}}`
  )
);

test(
  'should not rename to a name that a conditional rule redefines elsewhere in the document',
  passthroughCSS(
    `@keyframes a{${X}}@keyframes b{${X}}@media ${M}{@keyframes b{${Y}}}div{animation:a}`
  )
);

test(
  'should not rename a name that a conditional rule redefines elsewhere in the document',
  passthroughCSS(
    `@keyframes a{${X}}@keyframes b{${X}}@media ${M}{@keyframes a{${Y}}}div{animation:a}`
  )
);

test(
  'should merge names defined together in one conditional rule and rewrite references outside it',
  processCSS(
    `@keyframes c{${Y}}@media ${M}{@keyframes a{${X}}@keyframes b{${X}}}div{animation:a}`,
    `@keyframes c{${Y}}@media ${M}{@keyframes b{${X}}}div{animation:b}`
  )
);

test(
  'should not merge names when the later root definition of the name is the effective one',
  passthroughCSS(
    `@media ${M}{@keyframes a{${X}}@keyframes b{${X}}div{animation:a}}@keyframes a{from{left:0}}`
  )
);

// A keyframes rule inside a style rule is invalid and never defines a name.
test(
  'should not merge a name defined inside a style rule with a root name',
  passthroughCSS(`div{@keyframes a{${X}}}@keyframes b{${X}}p{animation:a}`)
);

// An unknown at-rule may never apply, so its definition says nothing about
// the root definition.
test(
  'should not merge a name defined inside an unknown at-rule with a root name',
  passthroughCSS(`@keyframes b{${X}}@foo{@keyframes a{${X}}}p{animation:b}`)
);

test(
  'should rewrite a string reference to a renamed name',
  processCSS(
    `@keyframes a{${X}}@keyframes b{${X}}div{animation:"a"}`,
    `@keyframes b{${X}}div{animation:b}`
  )
);

test(
  'should keep a separator when an identifier replaces a string reference',
  processCSS(
    `@keyframes a{${X}}@keyframes b{${X}}div{animation:1s"a"1s}`,
    `@keyframes b{${X}}div{animation:1s b 1s}`
  )
);

test(
  'should rewrite identifier and string references to the same name',
  processCSS(
    `@keyframes a{${X}}@keyframes b{${X}}div{animation-name:a,"a"}`,
    `@keyframes b{${X}}div{animation-name:b,b}`
  )
);

test(
  'should treat a string definition as a redefinition of the identifier of the same value',
  passthroughCSS(
    `@keyframes a{${X}}@keyframes b{${X}}@keyframes "a"{${Y}}div{animation:a}`
  )
);

test(
  'should rewrite references in vendor prefixed animation properties',
  processCSS(
    `@keyframes a{${X}}@keyframes b{${X}}div{-webkit-animation:a}`,
    `@keyframes b{${X}}div{-webkit-animation:b}`
  )
);

test(
  'should merge names whose prefixed and unprefixed definitions are identical',
  processCSS(
    `@-webkit-keyframes x{${X}}@keyframes x{${X}}@-webkit-keyframes y{${X}}@keyframes y{${X}}div{animation:x}`,
    `@-webkit-keyframes y{${X}}@keyframes y{${X}}div{animation:y}`
  )
);

// A browser may or may not treat the prefixed at-rule as an alias of the
// unprefixed one, so a name only defined in one family can't stand in for a
// name defined in the other.
test(
  'should not merge names defined in different vendor prefix families',
  passthroughCSS(
    `@-webkit-keyframes b{${X}}@keyframes c{${X}}div{animation:b;animation:c}`
  )
);

test(
  'should keep a string reference to a name that is not renamed',
  processCSS(
    `@keyframes a{${X}}@keyframes b{${X}}div{animation:"c" 1s,a 2s}`,
    `@keyframes b{${X}}div{animation:"c" 1s,b 2s}`
  )
);

test(
  'should respell a string reference to a string-named keyframes rule as a string',
  processCSS(
    `@keyframes "a b"{${X}}@keyframes "c d"{${X}}div{animation:1s"a b"1s}`,
    `@keyframes "c d"{${X}}div{animation:1s"c d"1s}`
  )
);

test(
  'should not merge a name defined in @scope with a top-level name',
  passthroughCSS(
    '@scope (.x){@keyframes a{0%{opacity:0}}}@keyframes b{0%{opacity:0}}div{animation:a 1s}'
  )
);

test(
  'should merge names defined together in one @scope rule',
  processCSS(
    '@scope (.x){@keyframes a{0%{opacity:0}}@keyframes b{0%{opacity:0}}}',
    '@scope (.x){@keyframes b{0%{opacity:0}}}'
  )
);

test(
  'should not merge names defined in different @supports rules',
  passthroughCSS(
    '@supports (display:flex){@keyframes a{0%{opacity:0}}}@supports (display:grid){@keyframes b{0%{opacity:0}}}'
  )
);

test(
  'should merge names defined together in one @supports rule',
  processCSS(
    '@supports (display:flex){@keyframes a{0%{opacity:0}}@keyframes b{0%{opacity:0}}}',
    '@supports (display:flex){@keyframes b{0%{opacity:0}}}'
  )
);

test(
  'should merge names defined together in an @media rule nested in a style rule',
  processCSS(
    'div{@media (min-width:1px){@keyframes a{0%{opacity:0}}@keyframes b{0%{opacity:0}}}}',
    'div{@media (min-width:1px){@keyframes b{0%{opacity:0}}}}'
  )
);

test(
  'should not merge names defined in @media rules nested in separate style rules',
  passthroughCSS(
    'div{@media (min-width:1px){@keyframes a{0%{opacity:0}}}}p{@media (min-width:1px){@keyframes b{0%{opacity:0}}}}'
  )
);
