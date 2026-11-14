import { describe, test } from 'node:test';
import {
  processCSSFactory,
  withTargets,
} from '../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';
const plugin = transformPlugin('mergeLonghand');

const modern = processCSSFactory([
  plugin(withTargets('chrome 120, firefox 120, safari 17')),
]);
const { passthroughCSS, processCSS } = modern;

describe('logical border side longhand merging', () => {
  for (const side of [
    'block-start',
    'block-end',
    'inline-start',
    'inline-end',
  ]) {
    test(
      `merges the border-${side} longhands in grammar order`,
      processCSS(
        `a{border-${side}-color:red;border-${side}-style:solid;border-${side}-width:2px}`,
        `a{border-${side}:2px solid red}`
      )
    );
  }

  test(
    'omits the initial width, style and currentcolor',
    processCSS(
      'a{border-block-start-width:medium;border-block-start-style:solid;border-block-start-color:currentcolor}',
      'a{border-block-start:solid}'
    )
  );

  test(
    'merges the hidden style that a border accepts',
    processCSS(
      'a{border-block-start-width:1px;border-block-start-style:hidden;border-block-start-color:red}',
      'a{border-block-start:1px hidden red}'
    )
  );

  test(
    'merges two sides independently',
    processCSS(
      'a{border-block-start-width:1px;border-block-end-width:2px;border-block-start-style:solid;border-block-end-style:dashed;border-block-start-color:red;border-block-end-color:blue}',
      'a{border-block-start:1px solid red;border-block-end:2px dashed blue}'
    )
  );

  test(
    'keeps longhands beside a physical border-top because the physical side may be the same side in some writing mode',
    passthroughCSS(
      'a{border-top-width:3px;border-block-start-width:1px;border-block-start-style:solid;border-block-start-color:red}'
    )
  );

  test(
    'keeps longhands beside a border shorthand because it resets every side',
    passthroughCSS(
      'a{border:1px solid;border-block-start-width:1px;border-block-start-style:solid;border-block-start-color:red}'
    )
  );

  test(
    'keeps longhands beside a border-width shorthand because it resets the width of every side',
    passthroughCSS(
      'a{border-width:1px;border-block-start-width:1px;border-block-start-style:solid;border-block-start-color:red}'
    )
  );

  test(
    'keeps longhands beside a border-block shorthand because it resets both block sides',
    passthroughCSS(
      'a{border-block:1px solid;border-block-start-width:1px;border-block-start-style:solid;border-block-start-color:red}'
    )
  );

  test(
    'keeps longhands beside a border-block-width shorthand because it resets the width of both block sides',
    passthroughCSS(
      'a{border-block-width:1px;border-block-start-width:1px;border-block-start-style:solid;border-block-start-color:red}'
    )
  );

  test(
    'keeps inline-start longhands beside a border-block-width because that shorthand does not reset the inline sides',
    processCSS(
      'a{border-block-width:1px;border-inline-start-width:1px;border-inline-start-style:solid;border-inline-start-color:red}',
      'a{border-block-width:1px;border-inline-start:1px solid red}'
    )
  );

  test(
    'keeps only two of the three longhands because the shorthand would reset the third',
    passthroughCSS(
      'a{border-block-start-width:1px;border-block-start-style:solid}'
    )
  );

  test(
    'keeps longhands when one target predates the logical border shorthands',
    processCSSFactory([
      plugin(withTargets('chrome 60, firefox 120')),
    ]).passthroughCSS(
      'a{border-block-start-width:1px;border-block-start-style:solid;border-block-start-color:red}'
    )
  );

  test(
    'keeps longhands beside a prefixed border-before property because WebKit names block-start that way',
    passthroughCSS(
      'a{border-block-start-width:1px;-webkit-border-before-width:3px;border-block-start-style:solid;border-block-start-color:red}'
    )
  );

  for (const [side, physical] of [
    ['block-end', 'border-bottom-width'],
    ['inline-start', 'border-left-width'],
    ['inline-end', 'border-right-width'],
  ]) {
    test(
      `keeps border-${side} longhands beside ${physical} because that side may be the physical one in some writing mode`,
      passthroughCSS(
        `a{border-${side}-width:1px;${physical}:3px;border-${side}-style:solid;border-${side}-color:red}`
      )
    );
  }

  for (const [side, legacy] of [
    ['block-start', 'before'],
    ['block-end', 'after'],
    ['inline-start', 'start'],
    ['inline-end', 'end'],
  ]) {
    test(
      `keeps border-${side} longhands beside the legacy -webkit-border-${legacy} shorthand because it sets the same side`,
      passthroughCSS(
        `a{border-${side}-width:1px;-webkit-border-${legacy}:2px dotted;border-${side}-style:solid;border-${side}-color:red}`
      )
    );
  }
});
