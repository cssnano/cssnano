import { test } from 'uvu';
import * as assert from 'uvu/assert';
import valueParser from 'postcss-value-parser';
import getArguments from '../getArguments';

test('should get arguments', () => {
  const parsed = valueParser('linear-gradient(to bottom left, red, blue)');

  assert.equal(getArguments(parsed.nodes[0]), [
    [
      {
        type: 'word',
        sourceIndex: 16,
        value: 'to',
      },
      {
        type: 'space',
        sourceIndex: 18,
        value: ' ',
      },
      {
        type: 'word',
        sourceIndex: 19,
        value: 'bottom',
      },
      {
        type: 'space',
        sourceIndex: 25,
        value: ' ',
      },
      {
        type: 'word',
        sourceIndex: 26,
        value: 'left',
      },
    ],
    [
      {
        type: 'word',
        sourceIndex: 32,
        value: 'red',
      },
    ],
    [
      {
        type: 'word',
        sourceIndex: 37,
        value: 'blue',
      },
    ],
  ]);
});
test.run();
