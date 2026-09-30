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

test(
  'should not leak keyframe replacements across conditional rule scopes',
  processCSS(
    '@media (max-width:400px){@keyframes a{from{top:0}to{top:10px}}@keyframes b{from{top:0}to{top:10px}}}div{animation:a 1s}@keyframes a{from{left:0}to{left:100px}}',
    '@media (max-width:400px){@keyframes b{from{top:0}to{top:10px}}}div{animation:a 1s}@keyframes a{from{left:0}to{left:100px}}'
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

test(
  'should correctly shadow outer merged definitions when nested conditional scope defines the same name',
  processCSS(
    '@keyframes a{0%{opacity:0}}@keyframes b{0%{opacity:0}}@media (min-width:600px){@keyframes a{0%{opacity:1}}div{animation:a 1s}}',
    '@keyframes b{0%{opacity:0}}@media (min-width:600px){@keyframes a{0%{opacity:1}}div{animation:a 1s}}'
  )
);

test(
  'should not rewrite reference when intermediate scope shadows target replacement name',
  processCSS(
    '@keyframes a{0%{opacity:0}}@keyframes b{0%{opacity:0}}@media (min-width:600px){@keyframes b{0%{opacity:1}}div{animation:a 1s}}',
    '@keyframes b{0%{opacity:0}}@media (min-width:600px){@keyframes b{0%{opacity:1}}div{animation:a 1s}}'
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

test(
  'should not leak keyframes replacements across container query scopes',
  processCSS(
    '@container (min-width:400px){@keyframes a{from{top:0}to{top:10px}}@keyframes b{from{top:0}to{top:10px}}}div{animation:a 1s}@keyframes a{from{left:0}to{left:100px}}',
    '@container (min-width:400px){@keyframes b{from{top:0}to{top:10px}}}div{animation:a 1s}@keyframes a{from{left:0}to{left:100px}}'
  )
);
