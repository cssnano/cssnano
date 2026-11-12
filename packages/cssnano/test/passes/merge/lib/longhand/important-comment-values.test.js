import { test } from 'node:test';
import { processCSSFactory } from '../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';

const plugin = transformPlugin('mergeLonghand');
const { processCSS, passthroughCSS } = processCSSFactory(plugin);

/* A value that holds an important comment is kept as written: the longhand
 * rounds neither fold, rewrite nor remove it, and no shorthand is merged across
 * it. A plain comment inside a value goes when its value is rewritten. */

test(
  'an important comment inside a shorthand value is kept as written',
  passthroughCSS('a{margin:0 /*!k*/ 1px}')
);

test(
  'an important comment in an overridden longhand is kept with the declaration that overrides it',
  passthroughCSS('a{margin-top:1px /*!k*/;margin-top:2px}')
);

test(
  'no shorthand is merged across a longhand that holds an important comment',
  passthroughCSS(
    'a{margin-top:1px;margin-right:1px /*!k*/;margin-bottom:1px;margin-left:1px}'
  )
);

test(
  'a plain comment inside a value is dropped when the value is folded',
  processCSS('a{margin:0 /* p */ 1px 0 1px}', 'a{margin:0 1px}')
);

test(
  'a border-radius value with an important comment is kept as written',
  passthroughCSS('a{border-radius:1px /*!k*/ 1px}')
);

test(
  'a value without comments still folds to its shortest form',
  processCSS('a{margin:0 0 0 0}', 'a{margin:0}')
);
