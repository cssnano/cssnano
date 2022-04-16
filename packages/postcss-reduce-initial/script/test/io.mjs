import fs from 'fs';
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { spy } from 'nanospy';
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

  assert.equal(JSON.parse(toJSONString(rawData)), rawData);
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
    const fileFunc = spy();
    write(fileFunc, paths, data, key);
    assert.is(fileFunc.calls[0][0], path);
    assert.is(fileFunc.calls[0][1], toJSONString(expected));
  });
}

test('should handle file operation errors', () => {
  assert.not.throws(handleError);
  assert.throws(() => handleError(new Error('something went wrong')));
});

test('should make it through promise chain with sample data and write 2 files', async () => {
  const fileFunc = spy();
  const fetchFunc = spy(async () => {
    return { json: () => Promise.resolve(testData) };
  });
  await generate(
    fetchFunc,
    fileFunc,
    paths,
    'https://example.com/properties.json'
  );

  assert.is(fileFunc.callCount, 2);
});

test.run();
