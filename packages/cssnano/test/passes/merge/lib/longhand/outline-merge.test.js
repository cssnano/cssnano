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

describe('outline longhand merging', () => {
  test(
    'merges width, style and color in grammar order',
    processCSS(
      'a{outline-color:red;outline-style:solid;outline-width:2px}',
      'a{outline:2px solid red}'
    )
  );

  test(
    'omits the initial medium width',
    processCSS(
      'a{outline-width:medium;outline-style:solid;outline-color:red}',
      'a{outline:solid red}'
    )
  );

  test(
    'omits the initial none style',
    processCSS(
      'a{outline-width:1px;outline-style:none;outline-color:red}',
      'a{outline:1px red}'
    )
  );

  test(
    'keeps currentcolor because the initial outline-color differs between specifications and engines (invert, currentcolor, auto)',
    processCSS(
      'a{outline-width:1px;outline-style:dashed;outline-color:currentColor}',
      'a{outline:1px dashed currentColor}'
    )
  );

  test(
    'keeps the color when width and style are initial',
    processCSS(
      'a{outline-width:medium;outline-style:none;outline-color:red}',
      'a{outline:red}'
    )
  );

  test(
    'keeps the hidden style because outline-style does not accept it',
    passthroughCSS(
      'a{outline-width:1px;outline-style:hidden;outline-color:red}'
    )
  );

  test(
    'merges the auto style when every target parses it',
    processCSS(
      'a{outline-width:1px;outline-style:auto;outline-color:red}',
      'a{outline:1px auto red}'
    )
  );

  test(
    'keeps the auto style when a target lacks it because that engine would drop the whole shorthand',
    processCSSFactory([plugin(withTargets('chrome 120, ie 8'))]).passthroughCSS(
      'a{outline-width:1px;outline-style:auto;outline-color:red}'
    )
  );

  test(
    'keeps the invert color because it is not a color the merge understands',
    passthroughCSS(
      'a{outline-width:1px;outline-style:solid;outline-color:invert}'
    )
  );

  test(
    'merges around outline-offset because outline does not reset it',
    processCSS(
      'a{outline-width:1px;outline-offset:2px;outline-style:solid;outline-color:red}',
      'a{outline-offset:2px;outline:1px solid red}'
    )
  );

  test(
    'merges equal CSS-wide keywords',
    processCSS(
      'a{outline-width:inherit;outline-style:inherit;outline-color:inherit}',
      'a{outline:inherit}'
    )
  );

  test(
    'keeps mixed CSS-wide keywords because a shorthand takes one for all',
    passthroughCSS(
      'a{outline-width:inherit;outline-style:solid;outline-color:red}'
    )
  );

  test(
    'keeps only two of the three longhands because the shorthand would reset the third',
    passthroughCSS('a{outline-width:1px;outline-style:solid}')
  );

  test(
    'keeps a negative width because the browser ignores it',
    passthroughCSS(
      'a{outline-width:-1px;outline-style:solid;outline-color:red}'
    )
  );

  test(
    'keeps a var() value because its type is unknown',
    passthroughCSS(
      'a{outline-width:var(--w);outline-style:solid;outline-color:red}'
    )
  );

  test(
    'keeps longhands around an outline shorthand because it resets them',
    passthroughCSS(
      'a{outline-width:1px;outline:2px dotted blue;outline-style:solid;outline-color:red}'
    )
  );

  test(
    'merges the normal and the important longhands separately',
    processCSS(
      'a{outline-width:1px!important;outline-style:solid!important;outline-color:red!important;outline-width:2px;outline-style:dotted;outline-color:blue}',
      'a{outline:1px solid red!important;outline:2px dotted blue}'
    )
  );
});
