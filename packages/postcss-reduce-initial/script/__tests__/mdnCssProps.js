import {
  isUserAgentDependent,
  isComplexSyntax,
  isUnpredictable,
  toPlainText,
  reduceInitial,
  validate,
} from '../lib/mdnCssProps.mjs';

import testData from './sampleProperties.json';

describe('should recognise user agent dependent flags', () => {
  test.each([
    ['dependsOnUserAgent', true],
    ['noPracticalInitialValue', true],
    ['noneButOverriddenInUserAgentCSS', true],
    ['variesFromBrowserToBrowser', true],
    ['invertOrCurrentColor', true],
    ['startOrNamelessValueIfLTRRightIfRTL', true],
    ['autoForSmartphoneBrowsersSupportingInflation', true],
    ['experimental', false],
    ['normal', false],
  ])('isUserAgentDependent(%p) expected: %p', (flag, expected) => {
    expect(isUserAgentDependent(flag)).toBe(expected);
  });
});

describe('should recognise properties with complex syntax', () => {
  test.each([
    [['foo', 'bar'], 'text-align', true],
    [['foo', 'bar'], '--*', true],
    ['normal', '--*', true],
    ['normal', 'word-wrap', false],
    ['100%', 'text-align', false],
  ])('isComplexSyntax(%p, %p) expected: %p', (initial, key, expected) => {
    expect(isComplexSyntax(initial, key)).toBe(expected);
  });
});

describe('should recognise properties with unpredictable behavior', () => {
  test.each([
    ['nonstandard', 'align-items', true],
    ['nonstandard', 'display', true],
    ['standard', 'display', true],
    ['standard', 'align-items', false],
    ['experimental', 'aspect-ratio', false],
  ])('isUnpredictable(%p, %p) expected: %p', (status, key, expected) => {
    expect(isUnpredictable(status, key)).toBe(expected);
  });
});

describe('should strip HTML, but leave relevant chars and separating spaces', () => {
  test.each([
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
  ])('toPlainText(%p) expected: %p', (string, expected) => {
    expect(toPlainText(string)).toBe(expected);
  });
});

describe('Reduce and validate sample data', () => {
  let processedData = '';

  beforeAll(() => {
    processedData = reduceInitial(testData);
  });

  test('should reduce to expected object structure', () => {
    expect(processedData).toEqual(
      expect.objectContaining({
        fromInitial: expect.any(Object),
        toInitial: expect.any(Object),
      })
    );
  });

  test('should reduce to expected number of fromInitial items', () => {
    expect(Object.keys(processedData.fromInitial)).toHaveLength(5);
  });

  test('should reduce to expected number of toInitial items', () => {
    expect(Object.keys(processedData.toInitial)).toHaveLength(3);
  });

  test('should validate and return sample data as resolved promise', async () => {
    expect.assertions(1);
    await expect(validate(processedData)).resolves.toEqual(processedData);
  });

  test('should fail validation on missing data', async () => {
    expect.assertions(1);
    await expect(validate(undefined)).rejects.toThrow(Error);
  });

  test('should fail validation on missing fromInitial', async () => {
    const partialData = JSON.parse(JSON.stringify(processedData));

    delete partialData.fromInitial;

    expect.assertions(1);
    await expect(validate(partialData)).rejects.toThrow(Error);
  });

  test('should fail validation on missing toInitial', async () => {
    const partialData = JSON.parse(JSON.stringify(processedData));

    delete partialData.toInitial;

    expect.assertions(1);
    await expect(validate(partialData)).rejects.toThrow(Error);
  });
});
