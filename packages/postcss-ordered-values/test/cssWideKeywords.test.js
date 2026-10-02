import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS } = processCSSFactory(plugin);

/*
 * `revert-rule` is a CSS-wide keyword in css-cascade-6. A CSS-wide keyword is
 * the entire value of a declaration, so each value below is invalid.
 * Reordering it would not make it valid, but the plugin must not interpret a
 * word it has to treat as reserved as a color, name or type, so the value
 * stays byte-identical.
 */

test(
  'border: does not take revert-rule for a color, so the invalid value keeps its order',
  passthroughCSS('a{border:revert-rule solid 1px}')
);

test(
  'animation: does not take revert-rule for a name, so the invalid value keeps its order',
  passthroughCSS('a{animation:ease-in 1s revert-rule}')
);

test(
  'transition: does not take revert-rule for a property, so the invalid value keeps its order',
  passthroughCSS('a{transition:1s ease-in revert-rule}')
);

test(
  'list-style: does not take revert-rule for a type, so the invalid value keeps its order',
  passthroughCSS('a{list-style:inside revert-rule}')
);

test(
  'box-shadow: does not take revert-rule for a color, so the invalid value keeps its order',
  passthroughCSS('a{box-shadow:revert-rule 1px 2px}')
);

test(
  'grid-row: does not take revert-rule for a line name, so the invalid value keeps its order',
  passthroughCSS('a{grid-row:revert-rule span 2}')
);
