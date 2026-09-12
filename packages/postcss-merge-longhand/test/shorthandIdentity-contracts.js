import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';
import minifyShorthandIdentities, {
  foldShorthandDeclaration,
} from '../src/lib/minifyShorthand.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

function matchingRawValuePlugin() {
  return {
    postcssPlugin: 'matching-raw-value-test-plugin',
    Declaration(decl) {
      if (decl.prop === 'gap') {
        decl.raws.value = { raw: '1rem 1rem', value: '1rem 1rem' };
      }
    },
  };
}

matchingRawValuePlugin.postcss = true;

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

describe('shorthand identity rule integration contracts', () => {
  test(
    'normalizes shorthand identities in rules containing box and border merges',
    processCSS(
      'a{margin-top:10px;margin-right:20px;margin-bottom:10px;margin-left:20px;gap:1rem 1rem;border-top-style:solid;border-top-color:red;border-top-width:1px}',
      'a{margin:10px 20px;gap:1rem;border-top:1px solid red}'
    )
  );

  test(
    'normalizes shorthand identities alongside column and border-radius merges',
    processCSS(
      'a{columns:12em auto;column-width:10px;column-count:2;border-top-left-radius:1px;border-top-right-radius:1px;border-bottom-right-radius:1px;border-bottom-left-radius:1px;aspect-ratio:2/1}',
      'a{columns:10px 2;border-radius:1px;aspect-ratio:2}'
    )
  );

  test(
    'normalizes repeated shorthand declarations within the same rule',
    processCSS('a{gap:2rem 2rem;gap:1rem 1rem}', 'a{gap:2rem;gap:1rem}')
  );

  test(
    'shares normalization cache across multiple rules in the same stylesheet',
    processCSS(
      'a{gap:1rem 1rem;overflow:hidden hidden}b{gap:1rem 1rem;overflow:hidden hidden}',
      'a{gap:1rem;overflow:hidden}b{gap:1rem;overflow:hidden}'
    )
  );

  test(
    'normalizes shorthand identities inside at-rule nested rules',
    processCSS(
      '@media (min-width:600px){a{gap:1rem 1rem;inset:0 0 0 0}}',
      '@media (min-width:600px){a{gap:1rem;inset:0}}'
    )
  );

  test('updates raw value metadata when upstream raw value matches', async () => {
    const result = await processCSSFactory([
      matchingRawValuePlugin,
      plugin,
    ]).processor('a{gap:1rem 1rem}');
    assert.strictEqual(result.css, 'a{gap:1rem}');
  });

  test('preserves backward-compatible root walk with minifyShorthandIdentities', () => {
    const root = postcss.parse('a{gap:1rem 1rem}');
    minifyShorthandIdentities(root);
    assert.strictEqual(root.toString(), 'a{gap:1rem}');
  });

  test(
    'normalizes direct declarations inside nested at-rules',
    processCSS(
      '.card{@media (min-width:600px){gap:1rem 1rem;inset:0 0 0 0}}',
      '.card{@media (min-width:600px){gap:1rem;inset:0}}'
    )
  );

  test(
    'normalizes shorthand identities in @position-try at-rules',
    processCSS(
      '@position-try --target{inset:0 0 0 0;aspect-ratio:1/1}',
      '@position-try --target{inset:0;aspect-ratio:1}'
    )
  );

  test(
    'normalizes shorthand declarations at stylesheet root level',
    processCSS('gap:1rem 1rem;inset:0 0 0 0', 'gap:1rem;inset:0')
  );

  test('folds shorthand declaration without memoTable', () => {
    const decl = postcss.decl({ prop: 'gap', value: '1rem 1rem' });
    foldShorthandDeclaration(decl);
    assert.strictEqual(decl.value, '1rem');
  });

  test('ignores declarations with stylehacks during in-place folding', () => {
    const decl = postcss.decl({ prop: '_gap', value: '1rem 1rem' });
    foldShorthandDeclaration(decl);
    assert.strictEqual(decl.value, '1rem 1rem');
  });

  test('ignores non-shorthand declarations during in-place folding', () => {
    const decl = postcss.decl({ prop: 'color', value: 'red' });
    foldShorthandDeclaration(decl);
    assert.strictEqual(decl.value, 'red');
  });
});
