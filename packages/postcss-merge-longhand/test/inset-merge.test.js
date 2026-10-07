import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

/* Chrome 87, Firefox 66 and Safari 14.1 shipped `inset`, long after `top`. */
const modern = { overrideBrowserslist: ['chrome 120'] };
const legacy = { overrideBrowserslist: ['ie 11'] };

describe('inset', () => {
  test(
    'condenses repeated sides of the shorthand',
    processCSS('a{inset:1px 2px 1px 2px}', 'a{inset:1px 2px}', legacy)
  );

  test(
    'merges the four sides into inset when every target supports it',
    processCSS(
      'a{top:1px;right:2px;bottom:3px;left:4px}',
      'a{inset:1px 2px 3px 4px}',
      modern
    )
  );

  test(
    'merges equal sides into one value',
    processCSS('a{top:0;right:0;bottom:0;left:0}', 'a{inset:0}', modern)
  );

  test(
    'merges auto and negative values and percentages, which inset takes',
    processCSS(
      'a{top:-1px;right:5%;bottom:-1px;left:5%}',
      'a{inset:-1px 5%}',
      modern
    )
  );

  test(
    'merges auto sides',
    processCSS(
      'a{top:auto;right:auto;bottom:auto;left:auto}',
      'a{inset:auto}',
      modern
    )
  );

  test(
    'keeps the four sides apart for a target without inset because it would drop all of them',
    passthroughCSS('a{top:0;right:0;bottom:0;left:0}', legacy)
  );

  test(
    'keeps the sides apart for Safari 14.0, which predates inset',
    passthroughCSS('a{top:0;right:0;bottom:0;left:0}', {
      overrideBrowserslist: ['safari 14'],
    })
  );

  test(
    'folds a later side into the shorthand when every target supports it',
    processCSS('a{inset:1px 2px;top:3px}', 'a{inset:3px 2px 1px}', modern)
  );

  test(
    'keeps a later side for a target without inset because it is the fallback there',
    passthroughCSS('a{inset:1px 2px;top:3px}', legacy)
  );

  test(
    'repeats a neighbour in a side the later top overrides, for a target without inset',
    processCSS(
      'a{inset:1px 2px 3px 2px;top:3px}',
      'a{inset:3px 2px;top:3px}',
      legacy
    )
  );

  test(
    'drops a side that a later inset overrides on all sides',
    processCSS('a{top:1px;inset:2px}', 'a{inset:2px}', modern)
  );

  test(
    'keeps a side before a later inset for a target without inset, where it is the fallback',
    passthroughCSS('a{top:1px;inset:2px}', legacy)
  );

  test(
    'drops an inset longhand of the flow-relative kind that the four sides override',
    processCSS(
      'a{inset-block-start:1px;top:1px;bottom:1px;right:1px;left:1px}',
      'a{inset:1px}',
      modern
    )
  );

  test(
    'keeps inset-block-start before top because top may set another side in a vertical writing mode',
    passthroughCSS('a{inset-block-start:1px;top:2px}', modern)
  );

  test(
    'keeps physical sides apart across inset-block-start',
    passthroughCSS(
      'a{top:1px;inset-block-start:0;right:1px;bottom:1px;left:1px}',
      modern
    )
  );

  test(
    'keeps the sides apart across inset-area, which the plugin does not know',
    passthroughCSS('a{top:0;right:0;inset-area:top;bottom:0;left:0}', modern)
  );
});

describe('inset with values the plugin cannot evaluate or that no browser keeps', () => {
  test(
    'keeps a side holding anchor() because the plugin cannot evaluate it',
    passthroughCSS('a{top:anchor(bottom);right:0;bottom:0;left:0}', modern)
  );

  test(
    'keeps inset holding anchor()',
    passthroughCSS('a{inset:anchor(bottom)}', modern)
  );

  test(
    'keeps a side holding anchor-size() next to the shorthand',
    passthroughCSS('a{inset:1px;top:anchor-size(width)}', modern)
  );

  test(
    'keeps a side holding anchor() inside calc() because a browser without anchor positioning drops it',
    passthroughCSS(
      'a{top:calc(anchor(--a top) + 1px);right:5px;bottom:5px;left:5px}',
      modern
    )
  );

  test(
    'keeps a side with two values because top takes exactly one',
    passthroughCSS('a{top:1px 2px;right:0;bottom:0;left:0}', modern)
  );

  test(
    'keeps inset with five values because a browser drops it',
    passthroughCSS('a{inset:1px 2px 3px 4px 5px;top:0;right:0}', modern)
  );

  test(
    'keeps a unitless non-zero side because a browser drops it',
    passthroughCSS('a{top:5;right:0;bottom:0;left:0}', modern)
  );
});
