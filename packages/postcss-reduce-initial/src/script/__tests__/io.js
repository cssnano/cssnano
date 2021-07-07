import nock from 'nock';
import { handleError, toJSONString, write, generate } from '../lib/io.mjs';
import testData from './sampleProperties.json';

describe('toJSONString', () => {
  const rawData = {
    foo: 'bar',
    'baz-qux': 'quux',
    quuz: 'corge',
    garply: 'waldo',
    'fred-plugh': 'xyzzy-thud',
  };

  test('should have correct data type (string)', () => {
    expect(typeof toJSONString(rawData)).toBe('string');
  });

  test('should produce parsable JSON', () => {
    expect(JSON.parse(toJSONString(rawData))).toEqual(rawData);
  });

  test('should have a trailing newline', () => {
    expect(toJSONString(rawData)).toMatch(/\n$/);
  });
});

describe('File operations', () => {
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
});

describe('Data fetching', () => {
  const url = 'https://example.com/properties.json';
  const paths = { fromInitial: '/', toInitial: '/' };

  test('should make it through promise chain and write 2 files', async () => {
    const fileFunc = jest.fn();
    nock('https://example.com').get('/properties.json').reply(200, testData);

    await generate(url, fileFunc, paths);

    expect(fileFunc).toHaveBeenCalledTimes(2);
  });

  test('should throw on failed API call', async () => {
    const fileFunc = jest.fn();
    nock('https://example.com')
      .get('/properties.json')
      .replyWithError('oh noes');

    expect.assertions(1);
    await generate(url, fileFunc, paths).catch((error) => {
      expect(error.message).toMatch('oh noes');
    });
  });

  test('should throw on empty data', async () => {
    const fileFunc = jest.fn();
    nock('https://example.com').get('/properties.json').reply(200, {});

    expect.assertions(1);
    await generate(url, fileFunc, paths).catch((error) => {
      expect(error.message).toBeDefined();
    });
  });
});
