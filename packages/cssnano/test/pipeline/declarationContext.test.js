import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { tokenize } from '@csstools/css-tokenizer';
import { hostPlugin } from '../../src/pipeline/host.js';
import {
  IN_KEYFRAMES,
  IN_PROPERTY,
  PERCENTAGE_SYNTAX,
  hasContextBit,
} from '../../src/pipeline/context.js';

/**
 * A reducer that replaces the value with the names of the context bits it
 * receives, so the output shows the context of each declaration.
 */
const reportContext = (
  /** @type {import('../../src/values/valueBuffer.js').ValueBuffer} */ buffer,
  /** @type {number} */ context
) => {
  const names = [];
  if (hasContextBit(context, IN_KEYFRAMES)) names.push('keyframes');
  if (hasContextBit(context, IN_PROPERTY)) names.push('property');
  if (hasContextBit(context, PERCENTAGE_SYNTAX)) names.push('percentage');
  const text = names.join(',') || 'none';
  buffer.replace(
    0,
    buffer.tokens().length,
    tokenize({ css: text }).slice(0, -1)
  );
};

/**
 * A stage that reports the context of the declarations of one property.
 * @param {string} property
 * @returns {import('../../src/pipeline/host.js').Stage}
 */
const reportingStage = (property) => ({
  forProperty: (prop) => (prop === property ? reportContext : null),
});

/**
 * @param {string} css
 * @param {string} property
 * @returns {Promise<string>}
 */
async function reportedCss(css, property) {
  const host = hostPlugin([
    {
      entry: { create: () => reportingStage(property) },
      options: {},
      targets: false,
    },
  ]);
  const result = await postcss([host]).process(css, { from: undefined });
  return result.css;
}

describe('the context a value reducer receives', () => {
  test('a declaration outside any at-rule has no context bit', async () => {
    assert.equal(await reportedCss('a{color:red}', 'color'), 'a{color:none}');
  });

  test('a declaration inside @keyframes has the keyframes bit', async () => {
    assert.equal(
      await reportedCss('@keyframes k{from{color:red}}', 'color'),
      '@keyframes k{from{color:keyframes}}'
    );
  });

  test('a declaration inside @-webkit-keyframes has the keyframes bit', async () => {
    assert.equal(
      await reportedCss('@-webkit-keyframes k{from{color:red}}', 'color'),
      '@-webkit-keyframes k{from{color:keyframes}}'
    );
  });

  test('the keyframes bit is read from the at-rule name in any case', async () => {
    assert.equal(
      await reportedCss('@KeyFrames k{from{color:red}}', 'color'),
      '@KeyFrames k{from{color:keyframes}}'
    );
  });

  test('a declaration of a rule nested below @keyframes keeps the keyframes bit', async () => {
    assert.equal(
      await reportedCss('@media print{@keyframes k{to{color:red}}}', 'color'),
      '@media print{@keyframes k{to{color:keyframes}}}'
    );
  });

  test("the same value inside and outside @keyframes in one stylesheet gets each context's result", async () => {
    assert.equal(
      await reportedCss('a{color:red}@keyframes k{from{color:red}}', 'color'),
      'a{color:none}@keyframes k{from{color:keyframes}}'
    );
  });

  test('a direct declaration of @property has the property bit', async () => {
    assert.equal(
      await reportedCss(
        '@property --x{syntax:"*";initial-value:red}',
        'initial-value'
      ),
      '@property --x{syntax:"*";initial-value:property,percentage}'
    );
  });

  test('a declaration of a rule nested below @property has no property bit', async () => {
    assert.equal(
      await reportedCss(
        '@property --x{syntax:"*";a{initial-value:red}}',
        'initial-value'
      ),
      '@property --x{syntax:"*";a{initial-value:none}}'
    );
  });

  test('@property with a syntax that excludes percentages has the property bit alone', async () => {
    assert.equal(
      await reportedCss(
        '@property --x{syntax:"<color>";initial-value:red}',
        'initial-value'
      ),
      '@property --x{syntax:"<color>";initial-value:property}'
    );
  });

  test('@property with a syntax that includes percentages has the percentage bit', async () => {
    assert.equal(
      await reportedCss(
        '@property --x{syntax:"<length> | <percentage>";initial-value:1px}',
        'initial-value'
      ),
      '@property --x{syntax:"<length> | <percentage>";initial-value:property,percentage}'
    );
  });

  test('@property without a syntax declaration allows percentages', async () => {
    assert.equal(
      await reportedCss('@property --x{initial-value:red}', 'initial-value'),
      '@property --x{initial-value:property,percentage}'
    );
  });

  test('@property reads a syntax declaration that follows initial-value', async () => {
    assert.equal(
      await reportedCss(
        '@property --x{initial-value:red;syntax:"<color>"}',
        'initial-value'
      ),
      '@property --x{initial-value:property;syntax:"<color>"}'
    );
  });

  test('@property uses its last syntax declaration when there are two', async () => {
    assert.equal(
      await reportedCss(
        '@property --x{syntax:"<color>";syntax:"*";initial-value:red}',
        'initial-value'
      ),
      '@property --x{syntax:"<color>";syntax:"*";initial-value:property,percentage}'
    );
  });

  test('@property with a percentage-free last syntax has the property bit alone', async () => {
    assert.equal(
      await reportedCss(
        '@property --x{syntax:"*";syntax:"<color>";initial-value:red}',
        'initial-value'
      ),
      '@property --x{syntax:"*";syntax:"<color>";initial-value:property}'
    );
  });

  test('a declaration of @property with a keyframes ancestor has both bits', async () => {
    assert.equal(
      await reportedCss(
        '@keyframes k{@property --x{syntax:"*";initial-value:red}}',
        'initial-value'
      ),
      '@keyframes k{@property --x{syntax:"*";initial-value:keyframes,property,percentage}}'
    );
  });
});
