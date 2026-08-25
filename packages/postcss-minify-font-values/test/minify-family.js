import assert from 'node:assert/strict';
import test from 'node:test';
import minifyFamily from '../src/lib/minify-family.js';

test('minifies component-value font family lists', () => {
  assert.equal(
    minifyFamily(
      ' Times new Roman, sans-serif, "serif", "Roboto Plus", Georgia ',
      {
        removeQuotes: true,
      }
    ),
    'Times new Roman,sans-serif,"serif",Roboto Plus,Georgia'
  );
});

test('stops a family list at the generic family keyword', () => {
  assert.equal(
    minifyFamily('Times new Roman, "serif", sans-serif, "Roboto Plus"', {
      removeAfterKeyword: true,
    }),
    'Times new Roman,"serif",sans-serif'
  );
});
