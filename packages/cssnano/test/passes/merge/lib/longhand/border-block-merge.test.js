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

describe('border-block and border-inline longhand merging', () => {
  test(
    'merges equal start and end sides into border-block',
    processCSS(
      'a{border-block-start-width:1px;border-block-start-style:solid;border-block-start-color:red;border-block-end-width:1px;border-block-end-style:solid;border-block-end-color:red}',
      'a{border-block:1px solid red}'
    )
  );

  test(
    'merges equal inline sides into border-inline',
    processCSS(
      'a{border-inline-start-width:1px;border-inline-start-style:solid;border-inline-start-color:red;border-inline-end-width:1px;border-inline-end-style:solid;border-inline-end-color:red}',
      'a{border-inline:1px solid red}'
    )
  );

  test(
    'omits the initial components of the sides when they are equal',
    processCSS(
      'a{border-block-start-width:medium;border-block-start-style:none;border-block-start-color:currentcolor;border-block-end-width:medium;border-block-end-style:none;border-block-end-color:currentcolor}',
      'a{border-block:none}'
    )
  );

  test(
    'keeps the sides as written when they differ, because border-block would set both to one value',
    processCSS(
      'a{border-block-start-width:1px;border-block-start-style:solid;border-block-start-color:red;border-block-end-width:2px;border-block-end-style:solid;border-block-end-color:red}',
      'a{border-block-start:1px solid red;border-block-end:2px solid red}'
    )
  );

  test(
    'keeps the sides as written when only one component differs',
    processCSS(
      'a{border-block-start-width:1px;border-block-start-style:solid;border-block-start-color:red;border-block-end-width:1px;border-block-end-style:solid;border-block-end-color:blue}',
      'a{border-block-start:1px solid red;border-block-end:1px solid blue}'
    )
  );

  test(
    'merges sides whose units differ only in case, because CSS units are ASCII case-insensitive',
    processCSS(
      'a{border-block-start-width:1px;border-block-start-style:solid;border-block-start-color:red;border-block-end-width:1PX;border-block-end-style:solid;border-block-end-color:red}',
      'a{border-block:1px solid red}'
    )
  );

  test(
    'merges a lone side into its own shorthand, not into border-block',
    processCSS(
      'a{border-block-start-width:1px;border-block-start-style:solid;border-block-start-color:red}',
      'a{border-block-start:1px solid red}'
    )
  );

  test(
    'keeps mixed CSS-wide keywords across the sides because a shorthand takes one for all',
    processCSS(
      'a{border-block-start-width:inherit;border-block-start-style:inherit;border-block-start-color:inherit;border-block-end-width:1px;border-block-end-style:solid;border-block-end-color:red}',
      'a{border-block-start:inherit;border-block-end:1px solid red}'
    )
  );

  test(
    'merges equal CSS-wide keywords on both sides',
    processCSS(
      'a{border-block-start-width:inherit;border-block-start-style:inherit;border-block-start-color:inherit;border-block-end-width:inherit;border-block-end-style:inherit;border-block-end-color:inherit}',
      'a{border-block:inherit}'
    )
  );

  test(
    'keeps a border-block-width alias that writes both sides because it would block the merge',
    passthroughCSS(
      'a{border-block-start-width:1px;border-block-start-style:solid;border-block-start-color:red;border-block-end-width:1px;border-block-end-style:solid;border-block-end-color:red;border-block-width:2px}'
    )
  );

  test(
    'keeps the sides as written when a border-block shorthand is present, because the shorthand is not a longhand',
    passthroughCSS(
      'a{border-block:2px dotted blue;border-block-start-width:1px;border-block-start-style:solid;border-block-start-color:red;border-block-end-width:1px;border-block-end-style:solid;border-block-end-color:red}'
    )
  );

  test(
    'merges around a border-inline declaration because border-block does not reset it',
    processCSS(
      'a{border-block-start-width:1px;border-block-start-style:solid;border-block-start-color:red;border-inline-start-width:3px;border-block-end-width:1px;border-block-end-style:solid;border-block-end-color:red}',
      'a{border-inline-start-width:3px;border-block:1px solid red}'
    )
  );

  test(
    'keeps no border-block beside a legacy border-before shorthand, which the block would override',
    processCSS(
      'a{border-before:2px dotted blue;border-block-start-width:1px;border-block-start-style:solid;border-block-start-color:red;border-block-end-width:1px;border-block-end-style:solid;border-block-end-color:red}',
      'a{border-before:2px dotted blue;border-block-start-width:1px;border-block-start-style:solid;border-block-start-color:red;border-block-end:1px solid red}'
    )
  );

  test(
    'keeps no border-block beside a legacy border-before color, which names the start side the block would override',
    processCSS(
      'a{border-before-color:blue;border-block-start-width:1px;border-block-start-style:solid;border-block-start-color:red;border-block-end-width:1px;border-block-end-style:solid;border-block-end-color:red}',
      'a{border-before-color:blue;border-block-start-width:1px;border-block-start-style:solid;border-block-start-color:red;border-block-end:1px solid red}'
    )
  );

  test(
    'keeps the sides as written when a physical border property shares the cascade',
    passthroughCSS(
      'a{border-block-start-width:1px;border-block-start-style:solid;border-block-start-color:red;border-block-end-width:1px;border-block-end-style:solid;border-block-end-color:red;border-top-width:2px}'
    )
  );

  test(
    'keeps border-block as written in a target that does not parse it, so the sides merge alone',
    processCSSFactory([plugin(withTargets('chrome 80'))]).processCSS(
      'a{border-block-start-width:1px;border-block-start-style:solid;border-block-start-color:red;border-block-end-width:1px;border-block-end-style:solid;border-block-end-color:red}',
      'a{border-block-start:1px solid red;border-block-end:1px solid red}'
    )
  );
});
