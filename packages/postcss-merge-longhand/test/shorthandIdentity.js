import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);
function staleRawValuePlugin() {
  return {
    postcssPlugin: 'stale-raw-value-test-plugin',
    Declaration(decl) {
      if (decl.prop === 'gap') {
        decl.value = '1px 2px';
        decl.raws.value = { raw: '1px 1px', value: '1px 1px' };
      }
    },
  };
}

staleRawValuePlugin.postcss = true;

describe('two-axis shorthand identities', () => {
  test('uses the current value when raw metadata is stale', async () => {
    const result = await processCSSFactory([
      staleRawValuePlugin,
      plugin,
    ]).processor('a{gap:1px 1px}');
    assert.strictEqual(result.css, 'a{gap:1px 2px}');
  });

  test(
    'collapses equal gap axes',
    processCSS('a{gap:1rem 1rem}', 'a{gap:1rem}')
  );
  test(
    'collapses equal overflow axes',
    processCSS('a{overflow:hidden hidden}', 'a{overflow:hidden}')
  );
  test(
    'collapses equal overscroll axes',
    processCSS(
      'a{overscroll-behavior:contain contain}',
      'a{overscroll-behavior:contain}'
    )
  );
  test(
    'preserves the first raw spelling of an equal axis',
    processCSS('a{gap:1PX 1px}', 'a{gap:1PX}')
  );
  test(
    'collapses equal parser-verified math values',
    processCSS(
      'a{gap:calc(1px + 2px) calc(1px + 2px)}',
      'a{gap:calc(1px + 2px)}'
    )
  );
  test(
    'accepts a two-argument log nested in a length calculation',
    processCSS(
      'a{inset:calc(log(10,2) * 1px) 2px calc(log(10,2) * 1px) 2px}',
      'a{inset:calc(log(10,2) * 1px) 2px}'
    )
  );
  test(
    'does not collapse mixed axes',
    passthroughCSS(
      'a{gap:1rem 2rem;overflow:auto hidden;overscroll-behavior:auto none}'
    )
  );
});

describe('four-side shorthand identities', () => {
  test(
    'minifies inset side propagation',
    processCSS('a{inset:1px 2px 1px 2px}', 'a{inset:1px 2px}')
  );
  test(
    'minifies scroll-margin side propagation',
    processCSS('a{scroll-margin:1px 2px 1px 2px}', 'a{scroll-margin:1px 2px}')
  );
  test(
    'minifies scroll-padding side propagation',
    processCSS('a{scroll-padding:1px 2px 1px 2px}', 'a{scroll-padding:1px 2px}')
  );
  test(
    'preserves the distinct scroll-margin grammar',
    passthroughCSS('a{scroll-margin:1% 1%}')
  );
  test(
    'does not collapse mixed inset sides',
    passthroughCSS('a{inset:1px 2px 3px 4px}')
  );
  test(
    'does not accept sin as an inset length',
    passthroughCSS('a{inset:sin(0) 1px sin(0) 1px}')
  );
  test(
    'does not accept atan2 as an inset length',
    passthroughCSS('a{inset:atan2(1,2) 1px atan2(1,2) 1px}')
  );
});

describe('paired alignment shorthand identities', () => {
  test(
    'collapses equal place-items values',
    processCSS('a{place-items:baseline baseline}', 'a{place-items:baseline}')
  );
  test(
    'collapses equal place-self values with two-token baseline values',
    processCSS(
      'a{place-self:first baseline first baseline}',
      'a{place-self:first baseline}'
    )
  );
  test(
    'collapses equal place-self auto values',
    processCSS('a{place-self:auto auto}', 'a{place-self:auto}')
  );
  test(
    'collapses equal place-content values',
    processCSS('a{place-content:center center}', 'a{place-content:center}')
  );
  test(
    'keeps the explicit place-content baseline pair',
    passthroughCSS('a{place-content:baseline baseline}')
  );
  test(
    'keeps the explicit place-content first-baseline pair',
    passthroughCSS('a{place-content:first baseline first baseline}')
  );
});

describe('aspect-ratio identities', () => {
  test(
    'removes a literal unit denominator',
    processCSS('a{aspect-ratio:2/1}', 'a{aspect-ratio:2}')
  );
  test(
    'removes a literal unit denominator after auto',
    processCSS('a{aspect-ratio:auto 2/1}', 'a{aspect-ratio:auto 2}')
  );
  test('keeps a non-unit denominator', passthroughCSS('a{aspect-ratio:2/3}'));
  test('keeps an omitted denominator', passthroughCSS('a{aspect-ratio:2}'));
});

describe('transition identities', () => {
  test(
    'removes default transition components',
    processCSS('a{transition:all 0s ease 0s}', 'a{transition:all}')
  );
  test(
    'supports the prefixed transition property',
    processCSS(
      'a{-webkit-transition:opacity 0s ease 0s}',
      'a{-webkit-transition:opacity}'
    )
  );
  test(
    'reduces each item in a transition list',
    processCSS(
      'a{transition:all 0s ease 0s,opacity 1s ease 0s}',
      'a{transition:all,opacity 1s}'
    )
  );
  test(
    'keeps valid unchanged items in a transition list',
    processCSS(
      'a{transition:all,opacity 1s ease 0s}',
      'a{transition:all,opacity 1s}'
    )
  );
  test(
    'retains non-default transition components',
    processCSS(
      'a{transition:opacity 1s linear 2s}',
      'a{transition:opacity 1s linear 2s}'
    )
  );
  test(
    'preserves zero-duration transitions with non-zero delays',
    processCSS(
      'a{transition:height 0s ease .3s;transition:height 0s ease .3s,height 0s ease .3s}',
      'a{transition:height 0s .3s;transition:height 0s .3s,height 0s .3s}'
    )
  );
  test(
    'does not reinterpret a surviving delay as the duration',
    passthroughCSS('a{transition:all 0s 1s;transition:all 0s linear 1s}')
  );
  test(
    'allows a negative transition delay',
    processCSS(
      'a{transition:opacity 1s ease -1s}',
      'a{transition:opacity 1s -1s}'
    )
  );
  test(
    'removes defaults around a non-default timing function',
    processCSS(
      'a{transition:opacity 0s steps(2) 0s}',
      'a{transition:opacity steps(2)}'
    )
  );
});

describe('shorthand identity fail-closed contracts', () => {
  test(
    'rejects CSS-wide keyword components',
    passthroughCSS('a{gap:inherit inherit}')
  );
  test('rejects substitutions', passthroughCSS('a{gap:var(--gap) var(--gap)}'));
  test(
    'rejects environment substitutions',
    passthroughCSS('a{inset:env(x) env(x)}')
  );
  test('rejects comments', passthroughCSS('a{gap:1px /* same */ 1px}'));
  test(
    'rejects malformed values',
    passthroughCSS('a{gap:calc(1px +) calc(1px +)}')
  );
  test(
    'rejects unsupported functions',
    passthroughCSS('a{gap:foo(1px) foo(1px)}')
  );
  test(
    'rejects malformed function arguments',
    passthroughCSS('a{gap:calc(1px,2px) calc(1px,2px)}')
  );
  test(
    'rejects comma lists outside transitions',
    passthroughCSS('a{gap:1px,1px}')
  );
  test('rejects stylehacks', passthroughCSS('a{gap:1px\\9 1px\\9}'));
  test('rejects malformed ratios', passthroughCSS('a{aspect-ratio:2/}'));
  test(
    'rejects transitions without an explicit property',
    passthroughCSS('a{transition:0s ease 0s}')
  );
  test(
    'rejects malformed transition lists',
    passthroughCSS('a{transition:all 0s ease 0s,foo()}')
  );
  test(
    'rejects a component that only starts with a timing keyword',
    passthroughCSS('a{transition:all ease/foo}')
  );
});
