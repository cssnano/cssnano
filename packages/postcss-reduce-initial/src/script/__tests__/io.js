import fetch from 'node-fetch';
import { handleError, toJSONString, write, generate } from '../lib/io.mjs';
import testData from './sampleProperties.json';

jest.mock('node-fetch');

// Selectively bypass mocking to use a real Response obj
const { Response } = jest.requireActual('node-fetch');

describe('toJSONString', () => {
  const rawData = {
    foo: 'bar',
    'baz-qux': 'quux',
    quuz: 'corge',
    garply: 'waldo',
    'fred-plugh': 'xyzzy-thud',
  };

  test('should produce parsable JSON', () => {
    expect(JSON.parse(toJSONString(rawData))).toEqual(rawData);
  });
});

describe('Smoke tests', () => {
  const data = {
    fromInitial: { foo: 'bar', baz: 'qux' },
    toInitial: { qux: 'baz', bar: 'foo' },
  };
  const paths = { fromInitial: '/foo.json', toInitial: '/bar.json' };

  test.each([
    ['fromInitial', paths.fromInitial, data.fromInitial],
    ['toInitial', paths.toInitial, data.toInitial],
  ])('should write JSON file based on key (%p)', (key, path, expected) => {
    const err = expect.any(Function);
    const fileFunc = jest.fn();

    write(fileFunc, paths, data, key);

    expect(fileFunc).toHaveBeenCalledWith(path, toJSONString(expected), err);
  });

  test('should handle file operation errors', () => {
    expect(handleError).not.toThrowError();
    expect(() => handleError(new Error('something went wrong'))).toThrowError();
  });

  test('should make it through promise chain with sample data and write 2 files', async () => {
    const fileFunc = jest.fn();
    fetch.mockReturnValue(
      Promise.resolve(new Response(JSON.stringify(testData)))
    );

    await generate(fileFunc, paths, 'https://example.com/properties.json');

    expect(fileFunc).toHaveBeenCalledTimes(2);
  });
});
