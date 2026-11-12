// The second longhand round reads and commits the records of each block. These
// cases pin what the round writes back, since no node round remains to compare
// against.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTargets } from '../../../src/utils/browserTargets.js';
import { secondRoundOfText } from './lib/longhand/helpers/reduceRuns.js';

const browsers = resolveTargets({}, undefined);

test('the second round shortens a declaration no removal touched, and write-back writes it', () => {
  assert.strictEqual(
    secondRoundOfText('a{margin:1px 1px 1px 1px}', browsers),
    'a{margin:1px}'
  );
});

test('the second round keeps a value with an important comment as written', () => {
  assert.match(
    secondRoundOfText(
      'a{margin-top:1px/*! keep */;margin-right:1px;margin-bottom:1px;margin-left:1px}',
      browsers
    ),
    /margin-top:1px\/\*! keep \*\//v
  );
});

test('the second round merges across a sibling comment, which ends no run', () => {
  assert.match(
    secondRoundOfText(
      'a{margin-top:1px;/* plain */margin-right:1px;margin-bottom:1px;margin-left:1px}',
      browsers
    ),
    /margin:1px/v
  );
});
