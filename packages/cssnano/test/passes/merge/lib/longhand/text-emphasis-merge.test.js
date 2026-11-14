import { describe, test } from 'node:test';
import {
  processCSSFactory,
  withTargets,
} from '../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';
const plugin = transformPlugin('mergeLonghand');

const { passthroughCSS, processCSS } = processCSSFactory([
  plugin(withTargets('chrome 120, firefox 120, safari 17')),
]);

describe('text-emphasis longhand merging', () => {
  test(
    'merges style and color in grammar order',
    processCSS(
      'a{text-emphasis-color:red;text-emphasis-style:filled sesame}',
      'a{text-emphasis:filled sesame red}'
    )
  );

  test(
    'omits the currentcolor color, which is the initial value',
    processCSS(
      'a{text-emphasis-style:circle;text-emphasis-color:currentcolor}',
      'a{text-emphasis:circle}'
    )
  );

  test(
    'omits the none style, which is the initial value',
    processCSS(
      'a{text-emphasis-style:none;text-emphasis-color:red}',
      'a{text-emphasis:red}'
    )
  );

  test(
    'keeps none when both longhands are initial',
    processCSS(
      'a{text-emphasis-style:none;text-emphasis-color:currentcolor}',
      'a{text-emphasis:none}'
    )
  );

  test(
    'merges a string style',
    processCSS(
      'a{text-emphasis-style:"x";text-emphasis-color:red}',
      'a{text-emphasis:"x" red}'
    )
  );

  test(
    'merges the two keywords of a style in the order written, since the grammar takes either order',
    processCSS(
      'a{text-emphasis-style:sesame open;text-emphasis-color:currentcolor}',
      'a{text-emphasis:sesame open}'
    )
  );

  test(
    'merges a lone fill keyword as a style',
    processCSS(
      'a{text-emphasis-style:filled;text-emphasis-color:red}',
      'a{text-emphasis:filled red}'
    )
  );

  test(
    'keeps two fill keywords because the grammar allows one',
    passthroughCSS('a{text-emphasis-style:filled open;text-emphasis-color:red}')
  );

  test(
    'keeps two shapes because the grammar allows one',
    passthroughCSS('a{text-emphasis-style:dot circle;text-emphasis-color:red}')
  );

  test(
    'keeps an unknown style keyword as written',
    passthroughCSS('a{text-emphasis-style:unknown;text-emphasis-color:red}')
  );

  test(
    'keeps a var() style because its type is unknown',
    passthroughCSS('a{text-emphasis-style:var(--s);text-emphasis-color:red}')
  );

  test(
    'merges equal CSS-wide keywords',
    processCSS(
      'a{text-emphasis-style:inherit;text-emphasis-color:inherit}',
      'a{text-emphasis:inherit}'
    )
  );

  test(
    'keeps mixed CSS-wide keywords because a shorthand takes one for all',
    passthroughCSS('a{text-emphasis-style:inherit;text-emphasis-color:red}')
  );

  test(
    'keeps one longhand because the shorthand would reset the other',
    passthroughCSS('a{text-emphasis-style:dot}')
  );

  test(
    'merges around text-emphasis-position, which the shorthand does not reset',
    processCSS(
      'a{text-emphasis-position:under;text-emphasis-style:dot;text-emphasis-color:red}',
      'a{text-emphasis-position:under;text-emphasis:dot red}'
    )
  );

  test(
    'keeps the longhands when a text-emphasis shorthand that resets them is present',
    passthroughCSS(
      'a{text-emphasis-style:dot;text-emphasis-color:red;text-emphasis:open}'
    )
  );

  test(
    'keeps a prefixed longhand as written, since it shares the cascade with the unprefixed one',
    passthroughCSS('a{-webkit-text-emphasis-style:dot;text-emphasis-color:red}')
  );

  test(
    'merges the normal and the important longhands separately',
    processCSS(
      'a{text-emphasis-style:dot!important;text-emphasis-color:red!important;text-emphasis-style:open;text-emphasis-color:blue}',
      'a{text-emphasis:dot red!important;text-emphasis:open blue}'
    )
  );
});
