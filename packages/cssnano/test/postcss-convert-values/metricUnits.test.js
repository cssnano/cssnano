import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../../util/testHelpers.js';
import plugin from '../../src/plugins/postcss-convert-values/index.js';
import convert from '../../src/plugins/postcss-convert-values/lib/convert.js';

const { processCSS } = processCSSFactory(plugin);

describe('Metric units', () => {
  test(
    'should convert metric units although the length option is false',
    processCSS(
      'h1{width:16px;margin:100mm -100mm}',
      'h1{width:16px;margin:10cm -10cm}',
      { length: false }
    )
  );

  test('should convert q to cm when the length option is false', () => {
    assert.equal(convert(1000, 'q', { length: false }), '25cm');
  });

  test(
    'should not introduce the q unit, which longstanding browsers lack and merge-longhand treats as newer syntax',
    processCSS('h1{width:1.8cm}', 'h1{width:18mm}')
  );

  test(
    'should convert uppercase Q to cm, since units are ASCII case-insensitive',
    processCSS('h1{width:120Q}', 'h1{width:3cm}')
  );
});
