import fs from 'fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isUserAgentDependent,
  isComplexSyntax,
  isUnpredictable,
  toPlainText,
  reduceInitial,
  validate,
} from '../lib/mdnCssProps.mjs';

const testData = JSON.parse(
  fs.readFileSync(new URL('./sampleProperties.json', import.meta.url), 'utf-8')
);

for (const [flag, expected] of [
  ['dependsOnUserAgent', true],
  ['noPracticalInitialValue', true],
  ['noneButOverriddenInUserAgentCSS', true],
  ['variesFromBrowserToBrowser', true],
  ['invertOrCurrentColor', true],
  ['startOrNamelessValueIfLTRRightIfRTL', true],
  ['autoForSmartphoneBrowsersSupportingInflation', true],
  ['experimental', false],
  ['normal', false],
]) {
  test(`should recognize user agent dependent flag ${flag}`, () => {
    assert.strictEqual(isUserAgentDependent(flag), expected);
  });
}

for (const [initial, key, expected] of [
  [['foo', 'bar'], 'text-align', true],
  [['foo', 'bar'], '--*', true],
  ['normal', '--*', true],
  ['normal', 'word-wrap', false],
  ['100%', 'text-align', false],
]) {
  test(`isComplexSyntax(${initial}, ${key}) expected: ${expected}`, () => {
    assert.strictEqual(isComplexSyntax(initial, key), expected);
  });
}

for (const [status, key, expected] of [
  ['nonstandard', 'align-items', true],
  ['nonstandard', 'display', true],
  ['standard', 'display', true],
  ['standard', 'align-items', false],
  ['experimental', 'aspect-ratio', false],
]) {
  test(`isUnpredictable(${status}, ${key}) expected: ${expected}`, () => {
    assert.strictEqual(isUnpredictable(status, key), expected);
  });
}

for (const [string, expected] of [
  ['<script>foo</script>', ''],
  ['<script type="text/javascript">bar<script>', ''],
  ['<script src="myscripts.js">baz</script>', ''],
  ['Hello &amp; Goodbye', 'Hello & Goodbye'],
  ['Eye<br>glasses', 'Eyeglasses'],
  ['Hand<p>writing</p>', 'Handwriting'],
  ['No space at end ', 'No space at end'],
  ['padding-box', 'padding-box'],
  ['50% 50% 0', '50% 50% 0'],
  ['0% 0%', '0% 0%'],
  ['100%', '100%'],
  ['auto', 'auto'],
]) {
  test(`strip HTML, but leave relevant chars and separating spaces ${string} expected: ${expected}`, () => {
    assert.strictEqual(toPlainText(string), expected);
  });
}

let processedData = '';

test.before(() => {
  processedData = reduceInitial(testData);
});

test('should reduce to expected object structure', () => {
  assert.strictEqual(typeof processedData.fromInitial, 'object');
  assert.strictEqual(typeof processedData.toInitial, 'object');
});

test('should reduce to expected number of fromInitial items', () => {
  assert.strictEqual(Object.keys(processedData.fromInitial).length, 5);
});

test('should reduce to expected number of toInitial items', () => {
  assert.strictEqual(Object.keys(processedData.toInitial).length, 3);
});

test('should validate and return sample data as resolved promise', async () => {
  const result = await validate(processedData);
  assert.deepStrictEqual(result, processedData);
});

test('should fail validation on missing data', async () => {
  try {
    await validate(undefined);
    assert.ok(true, false, 'Should not be reached');
  } catch {
    assert.ok('Threw an error');
  }
});

test('should fail validation on missing fromInitial', async () => {
  const partialData = JSON.parse(JSON.stringify(processedData));
  delete partialData.fromInitial;

  try {
    await validate(partialData);
    assert.ok(true, false, 'Should not be reached');
  } catch {
    assert.ok('Threw an error');
  }
});

test('should fail validation on missing toInitial', async () => {
  const partialData = JSON.parse(JSON.stringify(processedData));
  delete partialData.toInitial;

  try {
    await validate(partialData);
    assert.ok(true, false, 'Should not be reached');
  } catch {
    assert.ok('Threw an error');
  }
});
