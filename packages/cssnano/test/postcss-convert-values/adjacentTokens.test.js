import { test } from 'node:test';
import {
  processCSSFactory,
  oneStagePlugin,
} from '../../../../util/testHelpers.js';
import convertValues from '../../src/plugins/postcss-convert-values/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(
  oneStagePlugin(convertValues)
);

test(
  'should keep `0px` before a touching number, as `0` and `.5px` would join into `0.5px`',
  passthroughCSS('a{margin:0px.5px}')
);

test(
  'should keep `0%` before a touching ident, as `0top` is not a valid position',
  passthroughCSS('a{background-position:0%top}')
);

test(
  'should keep `100%` before a touching `%`, as the declaration is invalid',
  passthroughCSS('a{opacity:100%%}')
);

test(
  'should keep `50%` before a touching `%`, as `.5%` is a valid percentage',
  passthroughCSS('a{opacity:50%%}')
);

test(
  'should keep `50%` before a touching exponent ident, as `.5e3` is a valid number',
  passthroughCSS('a{opacity:50%e3}')
);

test(
  'should still drop the unit of `0px` before a space',
  processCSS('a{margin:0px .5px}', 'a{margin:0 .5px}')
);

test(
  'should still drop the unit of `0px` before a comma',
  processCSS('a{margin:0px,1px}', 'a{margin:0,1px}')
);

test(
  'should keep `1.0` before a touching `.5`, as `1` and `.5` would join into `1.5`',
  passthroughCSS('a{margin:1.0.5}')
);

test(
  'should keep `0%` before a touching url, as `0url(x)` is not a valid value',
  passthroughCSS('a{margin:0%url(x)}')
);

test(
  'should keep `0%` before a touching CDC token, as `0-->` would read as a dimension',
  passthroughCSS('a{margin:0%-->}')
);

test(
  'should keep `0%` before a touching bad url, as `0url(x y)` would read as a dimension',
  passthroughCSS('a{margin:0%url(x y)}')
);

test(
  'should drop the unit of `0%` before a touching lone `.`, as a `.` without a digit cannot continue a number',
  processCSS('a{margin:0%.x}', 'a{margin:0.x}')
);
