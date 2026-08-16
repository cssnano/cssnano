import { suite, test } from 'node:test';
import assert from 'node:assert/strict';
import fuzzEvaluate from '../lib/fuzzEvaluate.js';
import fuzzGenerate from '../lib/fuzzGenerate.js';

const { differences, evaluate, initialState } = fuzzEvaluate;
const { generate, random, shrink } = fuzzGenerate;

/**
 * The evaluator is the fuzzer's oracle, so a bug in it either invents failures
 * or, worse, agrees with the plugin about a wrong answer. These check it
 * against hand-worked cases rather than against the plugin.
 */

/**
 * @param {string} css
 * @param {string} slot
 * @return {string|undefined}
 */
function slotOf(css, slot) {
  const [state] = evaluate(css);
  return state.get(slot);
}

suite('evaluator', () => {
  test('starts every slot at its initial value', () => {
    const state = initialState();

    assert.equal(state.size, 20);
    assert.equal(state.get('border-top-width'), 'medium');
    assert.equal(state.get('border-left-style'), 'none');
    assert.equal(state.get('border-right-color'), 'currentcolor');
    assert.equal(state.get('margin-bottom'), '0');
    assert.equal(state.get('padding-top'), '0');
  });

  test('a shorthand resets the components it leaves out', () => {
    assert.equal(slotOf('a{border-left:solid}', 'border-left-style'), 'solid');
    assert.equal(slotOf('a{border-left:solid}', 'border-left-width'), 'medium');
    assert.equal(
      slotOf('a{border-left:solid}', 'border-left-color'),
      'currentcolor'
    );
  });

  test('reads a shorthand by component and not by position', () => {
    /* `solid` is the style wherever it sits, which is the mistake a positional
     * read makes and the one that motivated this whole family of tests. */
    assert.equal(slotOf('a{border:solid 1px}', 'border-top-width'), '1px');
    assert.equal(slotOf('a{border:solid 1px}', 'border-top-style'), 'solid');
  });

  test('border reaches every side', () => {
    const [state] = evaluate('a{border:1px dashed red}');

    for (const side of ['top', 'right', 'bottom', 'left']) {
      assert.equal(state.get(`border-${side}-color`), 'red');
    }
  });

  test('spreads one to four values the way a trbl shorthand does', () => {
    assert.deepEqual(
      [...evaluate('a{margin:1px 2em}')[0]].filter(([slot]) =>
        slot.startsWith('margin')
      ),
      [
        ['margin-top', '1px'],
        ['margin-right', '2em'],
        ['margin-bottom', '1px'],
        ['margin-left', '2em'],
      ]
    );

    assert.equal(
      slotOf('a{border-color:red blue #fff}', 'border-left-color'),
      'blue'
    );
  });

  test('ignores a declaration tha the browser ignores', () => {
    /* A token stating no component of the property. */
    assert.equal(
      slotOf(
        'a{border-left-width:1px;border-left-width:red}',
        'border-left-width'
      ),
      '1px'
    );
    /* A component specified twice. */
    assert.equal(
      slotOf('a{border:1px;border:solid dashed}', 'border-top-width'),
      '1px'
    );
    /* One value more than the property takes. */
    assert.equal(
      slotOf('a{margin:1px;margin:1px 2em 0 1px 2em}', 'margin-top'),
      '1px'
    );
    /* A longhand takes exactly one value. */
    assert.equal(
      slotOf('a{margin-left:1px;margin-left:1px 2em}', 'margin-left'),
      '1px'
    );
  });

  test('resolves the global keywords it models to the initial value', () => {
    assert.equal(
      slotOf(
        'a{border-left-style:solid;border-left-style:initial}',
        'border-left-style'
      ),
      'none'
    );
    assert.equal(slotOf('a{margin:5px;margin:unset}', 'margin-top'), '0');
  });

  test('important declarations take precedence over ordinary regardless of order', () => {
    assert.equal(
      slotOf('a{margin-left:1px !important;margin-left:2em}', 'margin-left'),
      '1px'
    );
    assert.equal(
      slotOf('a{margin-left:2em;margin-left:1px !important}', 'margin-left'),
      '1px'
    );
  });

  test('leaves alone a property outside the families it models', () => {
    /* Matched on segment count, so these are not read as the shorthands their
     * leading segments spell. */
    assert.equal(
      slotOf('a{border-top-left-radius:5px}', 'border-top-width'),
      'medium'
    );
    assert.equal(
      slotOf('a{border-image-source:none}', 'border-top-style'),
      'none'
    );
    assert.equal(slotOf('a{margin-inline-start:5px}', 'margin-left'), '0');
  });

  test('reports the slots that differ', () => {
    const [before] = evaluate('a{border-left:1px solid red}');
    const [after] = evaluate('a{border-left:1px solid blue}');

    assert.deepEqual(differences(before, after), [
      { slot: 'border-left-color', expected: 'red', actual: 'blue' },
    ]);
    assert.deepEqual(differences(before, before), []);
  });
});

suite('generator', () => {
  test('generates the same corpus from the same seed', () => {
    assert.deepEqual(generate(3, 20), generate(3, 20));
    assert.notDeepEqual(generate(3, 20), generate(4, 20));
  });

  test('the generator draws across its whole range', () => {
    const corpus = generate(1, 3000).join('');

    for (const token of [
      'border:',
      'border-left:',
      'border-width:',
      'margin:',
      'padding-top:',
      '!important',
      'initial',
    ]) {
      assert.ok(corpus.includes(token), `never generated ${token}`);
    }
  });
});

test('the prng stays in range without bitwise operators', () => {
  const rng = random(1);

  for (let i = 0; i < 1000; i++) {
    const value = rng.int(7);
    assert.ok(Number.isInteger(value) && value >= 0 && value < 7);
  }
});

test('shrinks a failure to the declarations that still cause it', () => {
  const css = 'a{margin:1px;border:solid;padding:0;border-left-color:red}';

  assert.equal(
    shrink(css, (candidate) => candidate.includes('border:solid')),
    'a{border:solid}'
  );
});
