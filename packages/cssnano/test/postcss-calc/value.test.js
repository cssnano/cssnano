import { test } from 'node:test';
import {
  oneStagePlugin,
  processCSSFactory,
} from '../../../../util/testHelpers.js';
import calc from '../../src/plugins/postcss-calc/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(oneStagePlugin(calc));

test(
  'a calc() in a declaration value reduces to its resolved value',
  processCSS('a{width:calc(1px + 2px)}', 'a{width:calc(3px)}')
);

test(
  'a custom property value reduces too',
  processCSS('a{--x:calc(1px + 2px)}', 'a{--x:calc(3px)}')
);

test(
  'postcss-calc reduces a calc() whose comment tokens it skips',
  processCSS('a{width:calc(1px /* c */ + 2px)}', 'a{width:calc(3px)}')
);

test(
  'a comment after the value stays, because the reduced value is written without it',
  processCSS('a{width:calc(1px + 2px)/* c */}', 'a{width:calc(3px)/* c */}')
);

test(
  '!important is kept after the reduced value',
  processCSS(
    'a{width:calc(1px + 2px) !important}',
    'a{width:calc(3px) !important}'
  )
);

test(
  'two declarations with the same calc() both reduce',
  processCSS(
    'a{width:calc(1px + 2px)}b{width:calc(1px + 2px)}',
    'a{width:calc(3px)}b{width:calc(3px)}'
  )
);

test(
  'a calc() that cannot be resolved, with a variable, is left byte-identical',
  passthroughCSS('a{width:calc(1px + var(--x))}')
);
