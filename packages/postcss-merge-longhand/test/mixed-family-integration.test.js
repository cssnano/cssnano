import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

describe('mixed-family rules', () => {
  test(
    'reduces all six supported families in a single rule including border-spacing',
    processCSS(
      'a{margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px;padding-top:5px;padding-right:5px;padding-bottom:5px;padding-left:5px;border:1px solid red;border-width:2px;border-top-left-radius:4px;border-top-right-radius:4px;border-bottom-right-radius:4px;border-bottom-left-radius:4px;border-spacing:10px 10px;column-width:100px;column-count:2}',
      'a{margin:10px;padding:5px;border:2px solid red;border-radius:4px;border-spacing:10px;columns:100px 2}'
    )
  );

  test(
    'multi-family all reset isolates transforms across all active families including columns and radius',
    passthroughCSS(
      'a{margin-top:10px;margin-bottom:10px;padding-top:5px;padding-bottom:5px;border-top-left-radius:4px;border-bottom-right-radius:4px;column-width:100px;all:unset;margin-top:20px;margin-bottom:20px;padding-top:10px;padding-bottom:10px;border-top-left-radius:8px;border-bottom-right-radius:8px;column-count:2}'
    )
  );

  test(
    'foreign border property blocks border reduction while other families merge',
    processCSS(
      'a{margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px;border-image:none;border:1px solid red;border-width:2px;column-width:100px;column-count:2}',
      'a{margin:10px;border-image:none;border:1px solid red;border-width:2px;columns:100px 2}'
    )
  );

  test(
    'preserves lane isolation and cleans up overridden columns with mixed importance across all boundary',
    processCSS(
      'a{column-width:100px !important;column-count:2;all:unset !important;column-width:200px !important;columns:initial !important}',
      'a{column-width:100px !important;column-count:2;all:unset !important;columns:initial !important}'
    )
  );

  test(
    'border-radius handles all barrier and importance lanes properly',
    processCSS(
      'a{border-top-left-radius:4px;border-top-right-radius:4px;border-bottom-right-radius:4px;border-bottom-left-radius:4px;all:unset;border-top-left-radius:8px !important;border-top-right-radius:8px !important;border-bottom-right-radius:8px !important;border-bottom-left-radius:8px !important}',
      'a{border-radius:4px;all:unset;border-radius:8px !important}'
    )
  );

  test(
    'preserves comments between declarations across multiple families',
    processCSS(
      'a{/*c1*/margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px;/*c2*/padding-top:5px;padding-right:5px;padding-bottom:5px;padding-left:5px}',
      'a{/*c1*/margin:10px;/*c2*/padding:5px}'
    )
  );

  test(
    'preserves margin-inline and margin-block when physical margins merge',
    processCSS(
      'a{margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px;margin-inline:20px;margin-block:30px}',
      'a{margin:10px;margin-inline:20px;margin-block:30px}'
    )
  );

  test(
    'preserves interleaved margin-inline-start with physical margins',
    processCSS(
      'a{margin-inline-start:5px;margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px}',
      'a{margin-inline-start:5px;margin:10px}'
    )
  );

  test(
    'preserves padding-inline and padding-block when physical paddings merge',
    processCSS(
      'a{padding-top:5px;padding-right:5px;padding-bottom:5px;padding-left:5px;padding-inline:15px;padding-block:25px}',
      'a{padding:5px;padding-inline:15px;padding-block:25px}'
    )
  );

  test(
    'merges one family before all barrier while another family merges after it',
    processCSS(
      'a{margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px;padding-top:2px;all:unset;padding-top:5px;padding-right:5px;padding-bottom:5px;padding-left:5px}',
      'a{margin:10px;padding-top:2px;all:unset;padding:5px}'
    )
  );

  test(
    'handles multiple all barriers across declarations',
    processCSS(
      'a{margin-top:10px;all:unset;margin-top:20px;margin-right:20px;margin-bottom:20px;margin-left:20px;all:initial;margin-top:30px}',
      'a{margin-top:10px;all:unset;margin:20px;all:initial;margin-top:30px}'
    )
  );

  test(
    'handles pure all declaration rule without error',
    passthroughCSS('a{all:unset}')
  );

  test(
    'preserves malformed border-radius declarations without crashing under pre-computed lanes',
    passthroughCSS('a{border-radius:10px / / 20px;border-top-left-radius:5px}')
  );

  test(
    'preserves malformed margin declarations without crashing under pre-computed lanes',
    passthroughCSS(
      'a{margin-top:10px;margin-right:10foo;margin-bottom:10px;margin-left:10px}'
    )
  );

  test(
    'does not merge physical margins across an interleaved flow-relative margin declaration',
    passthroughCSS(
      'a{margin-top:10px;margin-right:10px;margin-inline-end:20px;margin-bottom:10px;margin-left:10px}'
    )
  );

  test(
    'does not merge physical margin shorthand with trailing physical longhand across flow-relative margin',
    passthroughCSS('a{margin:10px;margin-inline:20px;margin-left:5px}')
  );

  test(
    'merges independent physical margin segments before and after flow-relative margin',
    processCSS(
      'a{margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px;margin-inline:20px;margin-top:30px;margin-right:30px;margin-bottom:30px;margin-left:30px}',
      'a{margin-inline:20px;margin:30px}'
    )
  );

  test(
    'does not merge physical paddings across an interleaved flow-relative padding declaration',
    passthroughCSS(
      'a{padding-top:10px;padding-right:10px;padding-inline-end:20px;padding-bottom:10px;padding-left:10px}'
    )
  );

  test(
    'does not merge physical padding shorthand with trailing physical longhand across flow-relative padding',
    passthroughCSS('a{padding:10px;padding-inline:20px;padding-left:5px}')
  );

  test(
    'merges independent physical padding segments before and after flow-relative padding',
    processCSS(
      'a{padding-top:10px;padding-right:10px;padding-bottom:10px;padding-left:10px;padding-inline:20px;padding-top:30px;padding-right:30px;padding-bottom:30px;padding-left:30px}',
      'a{padding-inline:20px;padding:30px}'
    )
  );

  test(
    'cleans up earlier column longhand overridden by shorthand in the same lane',
    processCSS('a{column-width:100px;columns:200px}', 'a{columns:200px}')
  );

  test(
    'cleans up earlier column longhand when following longhands merge into shorthand',
    processCSS(
      'a{column-width:50px;column-width:100px;column-count:2}',
      'a{columns:100px 2}'
    )
  );

  test(
    'flow-relative border property blocks physical border reduction while other families merge',
    processCSS(
      'a{margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px;border-inline:1px solid red;border:1px solid red;border-width:2px;column-width:100px;column-count:2}',
      'a{margin:10px;border-inline:1px solid red;border:1px solid red;border-width:2px;columns:100px 2}'
    )
  );

  test(
    'preserves logical border-radius without merging physical border-radius',
    passthroughCSS(
      'a{border-start-start-radius:8px;border-top-left-radius:4px;border-top-right-radius:4px;border-bottom-right-radius:4px;border-bottom-left-radius:4px}'
    )
  );

  test(
    'allows important lane physical margins to merge when all declaration is normal importance',
    processCSS(
      'a{margin-top:10px !important;all:unset;margin-right:10px !important;margin-bottom:10px !important;margin-left:10px !important}',
      'a{all:unset;margin:10px !important}'
    )
  );
});

describe('stale raws.value clearing during in-place mutation', () => {
  test('clears raws.value when minifying a box singleton in-place', async () => {
    const root = postcss.parse('a{margin:10px 10px 10px 10px}');
    const decl = /** @type {import('postcss').Declaration} */ (
      root.first?.nodes?.[0]
    );
    decl.raws.value = {
      raw: '10px 10px 10px 10px /*keep*/',
      value: '10px 10px 10px 10px',
    };

    await postcss([plugin()]).process(root, { from: undefined });

    assert.strictEqual(decl.value, '10px');
    assert.strictEqual(decl.raws.value, undefined);
  });

  test('clears raws.value when normalizing a columns singleton in-place', async () => {
    const root = postcss.parse('a{columns:100px auto}');
    const decl = /** @type {import('postcss').Declaration} */ (
      root.first?.nodes?.[0]
    );
    decl.raws.value = {
      raw: '100px auto /*raw*/',
      value: '100px auto',
    };

    await postcss([plugin()]).process(root, { from: undefined });

    assert.strictEqual(decl.value, '100px');
    assert.strictEqual(decl.raws.value, undefined);
  });

  test('clears raws.value when minifying a border singleton in-place', async () => {
    const root = postcss.parse('a{border-width:10px 10px 10px 10px}');
    const decl = /** @type {import('postcss').Declaration} */ (
      root.first?.nodes?.[0]
    );
    decl.raws.value = {
      raw: '10px 10px 10px 10px /*raw*/',
      value: '10px 10px 10px 10px',
    };

    await postcss([plugin()]).process(root, { from: undefined });

    assert.strictEqual(decl.value, '10px');
    assert.strictEqual(decl.raws.value, undefined);
  });
});
