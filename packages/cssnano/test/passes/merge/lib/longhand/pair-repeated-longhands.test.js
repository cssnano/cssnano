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

describe('pair family repeated longhands', () => {
  test(
    'merges the later of two repeated longhands because the earlier is overridden',
    processCSS('a{row-gap:1px;row-gap:2dvh;column-gap:3px}', 'a{gap:2dvh 3px}')
  );

  test(
    'merges a repeated longhand of a three-slot family into the later value',
    processCSS(
      'a{column-rule-width:1px;column-rule-width:2px;column-rule-style:solid;column-rule-color:red}',
      'a{column-rule:2px solid red}'
    )
  );

  test(
    'merges each importance lane with its own repeat',
    processCSS(
      'a{row-gap:1px!important;row-gap:2px;column-gap:3px;column-gap:4px!important}',
      'a{gap:2px 3px;gap:1px 4px!important}'
    )
  );

  test(
    'keeps a var() value after a plain one because the plain one may be its fallback',
    passthroughCSS('a{row-gap:1px;row-gap:var(--x);column-gap:3px}')
  );
});
