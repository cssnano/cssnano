import fs from 'fs';
import { suite } from 'uvu';
import * as assert from 'uvu/assert';
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

const propertiesTests = suite('Recognize properties and flags');

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
  propertiesTests(`should recognize user agent dependent flag ${flag}`, () => {
    assert.is(isUserAgentDependent(flag), expected);
  });
}

for (const [initial, key, expected] of [
  [['foo', 'bar'], 'text-align', true],
  [['foo', 'bar'], '--*', true],
  ['normal', '--*', true],
  ['normal', 'word-wrap', false],
  ['100%', 'text-align', false],
]) {
  propertiesTests(
    `isComplexSyntax(${initial}, ${key}) expected: ${expected}`,
    () => {
      assert.is(isComplexSyntax(initial, key), expected);
    }
  );
}

for (const [status, key, expected] of [
  ['nonstandard', 'align-items', true],
  ['nonstandard', 'display', true],
  ['standard', 'display', true],
  ['standard', 'align-items', false],
  ['experimental', 'aspect-ratio', false],
]) {
  propertiesTests(
    `isUnpredictable(${status}, ${key}) expected: ${expected}`,
    () => {
      assert.is(isUnpredictable(status, key), expected);
    }
  );
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
  propertiesTests(
    `strip HTML, but leave relevant chars and separating spaces ${string} expected: ${expected}`,
    () => {
      assert.is(toPlainText(string), expected);
    }
  );
}

const validationTests = suite('Reduce and validate sample data');
let processedData = '';

validationTests.before(() => {
  processedData = reduceInitial(testData);
});

validationTests('should reduce to expected object structure', () => {
  assert.type(processedData.fromInitial, 'object');
  assert.type(processedData.toInitial, 'object');
});

validationTests('should reduce to expected number of fromInitial items', () => {
  assert.is(Object.keys(processedData.fromInitial).length, 5);
});

validationTests('should reduce to expected number of toInitial items', () => {
  assert.is(Object.keys(processedData.toInitial).length, 3);
});

validationTests(
  'should validate and return sample data as resolved promise',
  async () => {
    const result = await validate(processedData);
    assert.equal(result, processedData);
  }
);

validationTests('should fail validation on missing data', async () => {
  try {
    await validate(undefined);
    assert.unreachable();
  } catch (err) {
    assert.ok('Threw an error');
  }
});

validationTests('should fail validation on missing fromInitial', async () => {
  const partialData = JSON.parse(JSON.stringify(processedData));
  delete partialData.fromInitial;

  try {
    await validate(partialData);
    assert.unreachable();
  } catch (err) {
    assert.ok('Threw an error');
  }
});

validationTests('should fail validation on missing toInitial', async () => {
  const partialData = JSON.parse(JSON.stringify(processedData));
  delete partialData.toInitial;

  try {
    await validate(partialData);
    assert.unreachable();
  } catch (err) {
    assert.ok('Threw an error');
  }
});

propertiesTests.run();
validationTests.run();
