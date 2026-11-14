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

describe('row-rule longhand merging', () => {
  test(
    'merges width, style and color in grammar order',
    processCSS(
      'a{row-rule-color:red;row-rule-style:solid;row-rule-width:2px}',
      'a{row-rule:2px solid red}'
    )
  );

  test(
    'omits the initial width and color',
    processCSS(
      'a{row-rule-width:medium;row-rule-style:dashed;row-rule-color:currentcolor}',
      'a{row-rule:dashed}'
    )
  );

  test(
    'keeps row-rule longhands around a rule shorthand because rule resets them',
    passthroughCSS(
      'a{row-rule-width:1px;rule:2px dotted blue;row-rule-style:solid;row-rule-color:red}'
    )
  );

  test(
    'keeps row-rule longhands around a rule-color shorthand because it resets row-rule-color',
    passthroughCSS(
      'a{row-rule-width:1px;row-rule-style:solid;rule-color:blue;row-rule-color:red}'
    )
  );

  test(
    'merges the column-rule and row-rule longhands of one block separately',
    processCSS(
      'a{column-rule-width:1px;row-rule-width:2px;column-rule-style:solid;row-rule-style:dashed;column-rule-color:red;row-rule-color:blue}',
      'a{column-rule:1px solid red;row-rule:2px dashed blue}'
    )
  );

  test(
    'keeps both families as written beside a rule shorthand because it resets both',
    passthroughCSS(
      'a{column-rule-width:1px;column-rule-style:solid;column-rule-color:red;rule:1px dotted;row-rule-width:2px;row-rule-style:dashed;row-rule-color:blue}'
    )
  );
});
