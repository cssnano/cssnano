import fs from 'fs';
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { mock } from 'node:test';
import { handleError, toJSONString, write, generate } from '../lib/io.mjs';

const testData = JSON.parse(
  fs.readFileSync(new URL('./sampleProperties.json', import.meta.url), 'utf-8')
);

test('should produce parsable JSON', () => {
  const rawData = {
    foo: 'bar',
    'baz-qux': 'quux',
    quuz: 'corge',
    garply: 'waldo',
    'fred-plugh': 'xyzzy-thud',
  };

  assert.deepStrictEqual(JSON.parse(toJSONString(rawData)), rawData);
});

const data = {
  fromInitial: { foo: 'bar', baz: 'qux' },
  toInitial: { qux: 'baz', bar: 'foo' },
};
const paths = { fromInitial: '/foo.json', toInitial: '/bar.json' };

for (const [key, path, expected] of [
  ['fromInitial', paths.fromInitial, data.fromInitial],
  ['toInitial', paths.toInitial, data.toInitial],
]) {
  test(`should write JSON file based on key ${key}`, () => {
    const fileFunc = mock.fn();
    write(fileFunc, paths, data, key);
    assert.strictEqual(fileFunc.mock.calls[0].arguments[0], path);
    assert.strictEqual(
      fileFunc.mock.calls[0].arguments[1],
      toJSONString(expected)
    );
  });
}

test('should handle file operation errors', () => {
  assert.doesNotThrow(handleError);
  assert.throws(() => handleError(new Error('something went wrong')));
});

test('should make it through promise chain with sample data and write 2 files', async () => {
  const fileFunc = mock.fn();
  const fetchFunc = mock.fn(async () => {
    return { json: () => Promise.resolve(testData) };
  });
  await generate(
    fetchFunc,
    fileFunc,
    paths,
    'https://example.com/properties.json'
  );

  assert.strictEqual(fileFunc.mock.calls.length, 2);
});
