import valueParser from 'postcss-value-parser';
import getArguments from '../';

test('should get arguments', () => {
  const parsed = valueParser('linear-gradient(to bottom left, red, blue)');

  expect(getArguments(parsed.nodes[0])).toEqual([
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
