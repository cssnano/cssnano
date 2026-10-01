import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory([
  plugin({ overrideBrowserslist: 'chrome 120, firefox 120, safari 17' }),
]);

// A nested rule's declarations come before the declarations that follow it,
// which CSS Nesting then wraps in an implicit nested declarations rule. A
// shorthand inserted after the nested rule would therefore override it.
describe('longhand merging across a nested rule', () => {
  test(
    'does not merge margin longhands across a nested rule that sets one of them',
    passthroughCSS(
      'a{margin-top:1px;&{margin-top:2px}margin-right:1px;margin-bottom:1px;margin-left:1px}'
    )
  );

  test(
    'does not merge padding longhands across a nested rule that sets one of them',
    passthroughCSS(
      'a{padding-top:1px;&{padding-top:2px}padding-right:1px;padding-bottom:1px;padding-left:1px}'
    )
  );

  test(
    'does not merge border-radius longhands across a nested rule that sets one of them',
    passthroughCSS(
      'a{border-top-left-radius:1px;&{border-top-left-radius:2px}border-top-right-radius:1px;border-bottom-right-radius:1px;border-bottom-left-radius:1px}'
    )
  );

  test(
    'does not merge align-items and justify-items across a nested rule that sets align-items',
    passthroughCSS(
      'a{align-items:center;&{align-items:end}justify-items:center}'
    )
  );

  test(
    'does not merge columns longhands across a nested rule that sets one of them',
    passthroughCSS('a{column-width:1px;&{column-width:2px}column-count:2}')
  );

  test(
    'does not merge border longhands across a nested rule that sets one of them',
    passthroughCSS(
      'a{border-top-width:1px;&{border-top-width:2px}border-top-style:solid;border-top-color:red}'
    )
  );

  test(
    'does not merge margin longhands across a nested at-rule that sets one of them',
    passthroughCSS(
      'a{margin-top:1px;@media (min-width:1px){margin-top:2px}margin-right:1px;margin-bottom:1px;margin-left:1px}'
    )
  );

  test(
    'still merges margin longhands that follow a nested rule together',
    processCSS(
      'a{&{margin-top:2px}margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px}',
      'a{&{margin-top:2px}margin:1px}'
    )
  );

  // The merged border-color, border-style and border-width set only the
  // longhands the side shorthands already set, so border-image keeps its value.
  test(
    'merges border sides after a nested rule even though border-image precedes the nested rule',
    processCSS(
      'a{border-image:url(x) 30;&{color:red}border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-left:1px solid red;border-top-color:blue}',
      'a{border-image:url(x) 30;&{color:red}border-color:blue red red;border-style:solid;border-width:1px}'
    )
  );

  // A body-less at-rule such as @apply is replaced in place by declarations
  // that may set any longhand, so a merged shorthand must not move past it.
  test(
    'does not merge margin longhands across a body-less at-rule',
    passthroughCSS(
      'a{margin-top:1px;@apply x;margin-right:1px;margin-bottom:1px;margin-left:1px}'
    )
  );

  test(
    'does not merge align-items and justify-items across a body-less at-rule',
    passthroughCSS('a{align-items:center;@apply x;justify-items:center}')
  );

  test(
    'does not merge border longhands across a body-less at-rule',
    passthroughCSS(
      'a{border-top-width:1px;@apply x;border-top-style:solid;border-top-color:red}'
    )
  );

  test(
    'merges margin longhands that precede a nested rule',
    processCSS(
      'a{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px;&{margin-top:2px}}',
      'a{margin:1px;&{margin-top:2px}}'
    )
  );

  test(
    'merges padding longhands inside a deeply nested rule',
    processCSS(
      'a{&{&{padding-top:1px;padding-right:1px;padding-bottom:1px;padding-left:1px}}}',
      'a{&{&{padding:1px}}}'
    )
  );

  // The !important lane is a separate cascade layer from normal declarations,
  // and merging it across a nested rule would reorder it against that rule.
  test(
    'does not merge !important margin longhands across a nested rule',
    passthroughCSS(
      'a{margin-top:1px!important;margin-right:1px!important;&{x:y}margin-bottom:1px!important;margin-left:1px!important}'
    )
  );

  test(
    'merges border sides after a nested rule even though all precedes the nested rule',
    processCSS(
      'a{all:unset;&{color:red}border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-left:1px solid red}',
      'a{all:unset;&{color:red}border-color:red;border-style:solid;border-width:1px}'
    )
  );

  test(
    'reduces columns longhands in each run of declarations separated by a nested rule',
    processCSS(
      'a{column-width:1px;column-count:2;&{x:y}column-gap:1px;column-rule:none}',
      'a{columns:1px 2;&{x:y}column-gap:1px;column-rule:none}'
    )
  );

  // An empty nested rule has no declarations to override, so it cannot make a
  // merged shorthand change the cascade.
  test(
    'merges margin longhands across an empty nested rule',
    processCSS(
      'a{margin-top:1px;&{}margin-right:1px;margin-bottom:1px;margin-left:1px}',
      'a{&{}margin:1px}'
    )
  );
});
