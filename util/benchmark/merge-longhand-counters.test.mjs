import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  parseCounterArgs,
  validateComparisonCorpus,
} from './merge-longhand-counters-compare.mjs';

test('comparison consumes space-separated option values', () => {
  assert.deepEqual(
    parseCounterArgs([
      'base.json',
      'candidate.json',
      '--markdown',
      'comparison.md',
    ]),
    {
      positional: ['base.json', 'candidate.json'],
      argCase: undefined,
      argCompare: undefined,
      argOutput: undefined,
      argMarkdown: 'comparison.md',
    }
  );
});

test('comparison rejects reports with different corpus entries', () => {
  assert.throws(
    () =>
      validateComparisonCorpus(
        { files: [{ name: 'fixture' }] },
        { files: [{ name: 'fixture' }, { name: 'extra' }] }
      ),
    /corpus entries differ/
  );
});

test('comparison rejects reports with different corpus manifests', () => {
  assert.throws(
    () =>
      validateComparisonCorpus(
        { files: [{ name: 'fixture' }], corpusManifest: 'base' },
        { files: [{ name: 'fixture' }], corpusManifest: 'candidate' }
      ),
    /corpusManifest differs/
  );
});
