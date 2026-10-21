import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  familiesOf,
  mergeOracleDifference,
} from '../../../../../script/passes/merge/rules/lib/mergeOracle.js';

describe('merge oracle: gap family', () => {
  test('accepts a gap shorthand split into longhands that take the same values', () => {
    assert.equal(
      mergeOracleDifference('p{gap:1px}', 'p{row-gap:1px;column-gap:1px}'),
      undefined
    );
  });

  test('rejects a gap shorthand split into longhands that take different values', () => {
    assert.match(
      mergeOracleDifference(
        'p{gap:1px 2em}',
        'p{row-gap:1px;column-gap:1px}'
      ) ?? '',
      /column-gap/v
    );
  });

  test('accepts the legacy grid-gap spelling as the gap shorthand', () => {
    assert.equal(
      mergeOracleDifference('p{grid-gap:1px 2em}', 'p{gap:1px 2em}'),
      undefined
    );
  });

  test('rejects a gap value that makes an invalid declaration valid', () => {
    // Three values are not a gap, so the browser ignores the declaration.
    assert.match(
      mergeOracleDifference('p{gap:1px 2em 0}', 'p{row-gap:1px}') ?? '',
      /row-gap/v
    );
  });

  test('accepts dropping a gap declaration that is invalid', () => {
    assert.equal(mergeOracleDifference('p{gap:1px 2em 0}', 'p{}'), undefined);
  });

  test('accepts a CSS-wide keyword on gap as the same keyword on each longhand', () => {
    assert.equal(
      mergeOracleDifference(
        'p{gap:initial}',
        'p{row-gap:initial;column-gap:initial}'
      ),
      undefined
    );
  });

  test('rejects a reordering of row-gap and gap that changes the winning row-gap', () => {
    assert.notEqual(
      mergeOracleDifference('p{row-gap:1px;gap:2em}', 'p{gap:2em;row-gap:1px}'),
      undefined
    );
  });

  test('families of a stylesheet name gap for the shorthand and its legacy aliases', () => {
    assert.deepEqual(familiesOf('p{grid-row-gap:1px}'), ['gap']);
  });
});

describe('merge oracle: place-content family', () => {
  test('accepts a place-content shorthand with one value split into equal longhands', () => {
    assert.equal(
      mergeOracleDifference(
        'p{place-content:center}',
        'p{align-content:center;justify-content:center}'
      ),
      undefined
    );
  });

  test('rejects a place-content shorthand split into longhands that take different values', () => {
    assert.match(
      mergeOracleDifference(
        'p{place-content:center end}',
        'p{align-content:center;justify-content:center}'
      ) ?? '',
      /justify-content/v
    );
  });

  test('accepts a baseline place-content whose justify-content is start, because the omitted value defaults to start', () => {
    assert.equal(
      mergeOracleDifference(
        'p{place-content:baseline}',
        'p{align-content:baseline;justify-content:start}'
      ),
      undefined
    );
  });

  test('rejects copying a baseline position to justify-content, which does not accept it', () => {
    assert.match(
      mergeOracleDifference(
        'p{place-content:baseline}',
        'p{align-content:baseline;justify-content:baseline}'
      ) ?? '',
      /justify-content/v
    );
  });

  test('rejects turning an invalid place-content value into a justify-content declaration', () => {
    // `left` is a justify-content keyword only, so the shorthand is ignored.
    assert.match(
      mergeOracleDifference(
        'p{place-content:left}',
        'p{justify-content:left}'
      ) ?? '',
      /justify-content/v
    );
  });

  test('rejects a reordering of align-content and place-content that changes the winning align-content', () => {
    assert.notEqual(
      mergeOracleDifference(
        'p{align-content:start;place-content:end}',
        'p{place-content:end;align-content:start}'
      ),
      undefined
    );
  });

  test('families of a stylesheet name place-content for the shorthand and its longhands', () => {
    assert.deepEqual(familiesOf('p{align-content:center}'), ['place-content']);
  });
});

describe('merge oracle: place-items family', () => {
  test('accepts a place-items shorthand with one value split into equal longhands', () => {
    assert.equal(
      mergeOracleDifference(
        'p{place-items:center}',
        'p{align-items:center;justify-items:center}'
      ),
      undefined
    );
  });

  test('rejects a place-items shorthand split into longhands that take different values', () => {
    assert.match(
      mergeOracleDifference(
        'p{place-items:center end}',
        'p{align-items:center;justify-items:center}'
      ) ?? '',
      /justify-items/v
    );
  });

  test('rejects turning an invalid place-items value into a justify-items declaration', () => {
    // `left` is a justify-items keyword only, so the shorthand is ignored.
    assert.match(
      mergeOracleDifference('p{place-items:left}', 'p{justify-items:left}') ??
        '',
      /justify-items/v
    );
  });

  test('families of a stylesheet name place-items for the shorthand and its longhands', () => {
    assert.deepEqual(familiesOf('p{justify-items:center}'), ['place-items']);
  });
});

describe('merge oracle: place-self family', () => {
  test('accepts a place-self shorthand whose auto value is valid on both axes', () => {
    assert.equal(
      mergeOracleDifference(
        'p{place-self:auto}',
        'p{align-self:auto;justify-self:auto}'
      ),
      undefined
    );
  });

  test('rejects a place-self shorthand split into longhands that take different values', () => {
    assert.match(
      mergeOracleDifference(
        'p{place-self:center}',
        'p{align-self:center;justify-self:start}'
      ) ?? '',
      /justify-self/v
    );
  });

  test('rejects rewriting a place-self value as justify-self alone, which leaves align-self at auto', () => {
    // The shorthand sets align-self to center, and the rewrite leaves it auto.
    assert.match(
      mergeOracleDifference('p{place-self:center}', 'p{justify-self:center}') ??
        '',
      /align-self/v
    );
  });

  test('families of a stylesheet name place-self for the shorthand and its longhands', () => {
    assert.deepEqual(familiesOf('p{align-self:auto}'), ['place-self']);
  });
});

describe('merge oracle: overscroll-behavior family', () => {
  test('accepts an overscroll-behavior shorthand with one value split into equal longhands', () => {
    assert.equal(
      mergeOracleDifference(
        'p{overscroll-behavior:contain}',
        'p{overscroll-behavior-x:contain;overscroll-behavior-y:contain}'
      ),
      undefined
    );
  });

  test('rejects an overscroll-behavior shorthand split into longhands that take different values', () => {
    assert.match(
      mergeOracleDifference(
        'p{overscroll-behavior:none auto}',
        'p{overscroll-behavior-x:none;overscroll-behavior-y:none}'
      ) ?? '',
      /overscroll-behavior-y/v
    );
  });

  test('accepts overscroll-behavior-block as the y axis, its block axis in horizontal writing', () => {
    assert.equal(
      mergeOracleDifference(
        'p{overscroll-behavior-block:none}',
        'p{overscroll-behavior-y:none}'
      ),
      undefined
    );
  });

  test('rejects moving overscroll-behavior-inline onto the y axis', () => {
    assert.match(
      mergeOracleDifference(
        'p{overscroll-behavior-inline:none}',
        'p{overscroll-behavior-y:none}'
      ) ?? '',
      /overscroll-behavior-x/v
    );
  });

  test('families of a stylesheet name overscroll-behavior for the shorthand and its logical longhands', () => {
    assert.deepEqual(familiesOf('p{overscroll-behavior-block:auto}'), [
      'overscroll-behavior',
    ]);
  });
});

describe('merge oracle: overflow family', () => {
  test('accepts an overflow shorthand with one value split into equal longhands', () => {
    assert.equal(
      mergeOracleDifference(
        'p{overflow:hidden}',
        'p{overflow-x:hidden;overflow-y:hidden}'
      ),
      undefined
    );
  });

  test('accepts a two-value overflow shorthand split into the two axes it names', () => {
    assert.equal(
      mergeOracleDifference(
        'p{overflow:hidden scroll}',
        'p{overflow-x:hidden;overflow-y:scroll}'
      ),
      undefined
    );
  });

  test('rejects a two-value overflow shorthand split into longhands that take the first value on both axes', () => {
    assert.match(
      mergeOracleDifference(
        'p{overflow:hidden scroll}',
        'p{overflow-x:hidden;overflow-y:hidden}'
      ) ?? '',
      /overflow-y/v
    );
  });

  test('rejects moving overflow-block onto the x axis', () => {
    assert.match(
      mergeOracleDifference(
        'p{overflow-block:hidden}',
        'p{overflow-x:hidden}'
      ) ?? '',
      /overflow-x/v
    );
  });

  test('rejects turning an invalid three-value overflow into an overflow-x declaration', () => {
    assert.match(
      mergeOracleDifference(
        'p{overflow:hidden clip auto}',
        'p{overflow-x:hidden}'
      ) ?? '',
      /overflow-x/v
    );
  });

  test('families of a stylesheet name overflow for the shorthand and its logical longhands', () => {
    assert.deepEqual(familiesOf('p{overflow-inline:auto}'), ['overflow']);
  });
});

describe('merge oracle: flex-flow family', () => {
  test('accepts a flex-flow direction alone, with the initial nowrap for flex-wrap', () => {
    assert.equal(
      mergeOracleDifference(
        'p{flex-flow:column}',
        'p{flex-direction:column;flex-wrap:nowrap}'
      ),
      undefined
    );
  });

  test('accepts a flex-flow wrap alone, with the initial row for flex-direction', () => {
    assert.equal(
      mergeOracleDifference(
        'p{flex-flow:wrap}',
        'p{flex-direction:row;flex-wrap:wrap}'
      ),
      undefined
    );
  });

  test('accepts flex-flow components in either order', () => {
    assert.equal(
      mergeOracleDifference(
        'p{flex-flow:wrap column}',
        'p{flex-direction:column;flex-wrap:wrap}'
      ),
      undefined
    );
  });

  test('rejects dropping the flex-wrap of a flex-flow shorthand that sets it', () => {
    assert.match(
      mergeOracleDifference(
        'p{flex-flow:column wrap}',
        'p{flex-direction:column}'
      ) ?? '',
      /flex-wrap/v
    );
  });

  test('rejects flex-flow with two values of one component, which the browser ignores', () => {
    assert.match(
      mergeOracleDifference(
        'p{flex-flow:row column}',
        'p{flex-direction:column}'
      ) ?? '',
      /flex-direction/v
    );
  });

  test('families of a stylesheet name flex-flow for the shorthand and its longhands', () => {
    assert.deepEqual(familiesOf('p{flex-wrap:wrap}'), ['flex-flow']);
  });
});
