import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  splitComponents,
  wholeText,
} from '../../../../../src/passes/merge/lib/longhand/componentRanges.js';
import { splitValue } from '../../../../../src/passes/merge/lib/longhand/valueComponents.js';
import {
  parseCornerRadius,
  parseRadiusShorthand,
} from '../../../../../src/passes/merge/lib/longhand/validateRadius.js';
import { spellComponent } from '../../../../../src/passes/merge/lib/longhand/spelledText.js';
import { tokens } from '../../../../../src/utils/value.js';

test('splitComponents gives each component its text and its range of the value list', () => {
  const list = tokens('1px calc(2px + 3px)');
  const [first, second] = splitComponents('1px calc(2px + 3px)', list);
  assert.equal(first.raw, '1px');
  assert.equal(second.raw, 'calc(2px + 3px)');
  assert.equal(second.list, list);
  assert.deepEqual([second.start, second.end], [2, list.length]);
});

test('wholeText of a text with no function has no list to range over', () => {
  assert.deepEqual(wholeText('red'), {
    raw: 'red',
    list: undefined,
    start: 0,
    end: 0,
  });
});

test('splitValue components range over the list the caller passed', () => {
  const list = tokens('1px 2px');
  const parts = splitValue('1px 2px', undefined, list);
  assert.ok(
    parts?.[0].components.every((component) => component.list === list)
  );
});

test('a radius piece is a component of the value list, so a writer joins it without a copy', () => {
  const list = tokens('1px 2px');
  const parsed = parseRadiusShorthand('1px 2px', list);
  assert.ok(parsed);
  for (const piece of parsed.horizontal) {
    assert.equal(piece.list, list);
    assert.equal(list.slice(piece.start, piece.end).length > 0, true);
  }
});

test('a corner radius with one length is the same piece in both axes', () => {
  const parsed = parseCornerRadius('1px', tokens('1px'));
  assert.ok(parsed);
  assert.equal(parsed[0], parsed[1]);
});

test('spellComponent spells a component as the range the component already holds', () => {
  const list = tokens('1px 2px');
  const [component] = splitComponents('1px 2px', list);
  const spelled = spellComponent(component);
  assert.equal(spelled.text, '1px');
  assert.equal(spelled.pieces[0], component);
});
