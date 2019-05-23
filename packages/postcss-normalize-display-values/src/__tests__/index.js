import test from 'ava';
import mappings from '../lib/map';
import plugin from '..';
import getData from '../../../../util/getData';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../../util/testHelpers';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);
const data = getData(mappings);

test('should pass through "block ruby"', passthroughCSS, 'display:block ruby;');

test('should pass through single values', passthroughCSS, 'display:block;');

Object.keys(data).forEach((key) => {
  const actual = data[key];
  const expected = key;

  test(
    `display: ${actual} => display: ${expected}`,
    processCSS,
    `display:${actual}`,
    `display:${expected}`
  );
});

test(
  `display: block flow => display: block (uppercase property and values)`,
  processCSS,
  `DISPLAY:BLOCK FLOW`,
  `DISPLAY:block`
);

test(`should pass through variables`, passthroughCSS, `display:var(--foo)`);

test(
  `should pass through variables #1`,
  passthroughCSS,
  `display:var(--foo) var(--bar)`
);

test(`should pass through invalid syntax`, passthroughCSS, `display:`);

test(
  `should pass through not display property`,
  passthroughCSS,
  `something-display: block flow`
);

test('should use the postcss plugin api', usePostCSSPlugin, plugin());
