import assert from 'node:assert/strict';
import { test } from 'node:test';
import { doneLine } from '../report.js';

const result = (verdict) => ({ case: verdict, verdict });

test('the done line counts the verdicts and names the results file', () => {
  const line = doneLine({
    failed: false,
    results: [
      result('regression'),
      result('improvement'),
      result('no-meaningful-change'),
      result('no-meaningful-change'),
      result('inconclusive'),
    ],
    path: '/r/results.json',
  });
  assert.equal(
    line,
    'bench: done status=pass cases=5 regression=1 improvement=1 within-margin=2 inconclusive=1 results=/r/results.json'
  );
});

test('a regression does not fail the run, since results are advisory', () => {
  assert.match(
    doneLine({ failed: false, results: [result('regression')], path: 'p' }),
    /^bench: done status=pass /v
  );
});

test('a run that measured nothing has a done line without counts', () => {
  assert.equal(
    doneLine({ failed: true, results: [], path: undefined }),
    'bench: done status=fail'
  );
});
