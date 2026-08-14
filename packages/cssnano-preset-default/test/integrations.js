'use strict';
const { join } = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  integrationTests,
  loadPreset,
  processCSSWithPresetFactory,
} = require('../../../util/integrationTestHelpers.js');
const preset = require('../src/index.js');

const withDefaults = processCSSWithPresetFactory(preset);
const withBrowserslist = processCSSWithPresetFactory(
  preset({
    path: join(__dirname, 'browserslist/example.css'),
    env: 'modern',
  })
);

test(
  'should process CSS with default options',
  withDefaults.processCSS(
    'button { color: hsla(0 100% 50% / 40%); appearance: none }',
    'button{color:rgba(255,0,0,.4);appearance:none}'
  )
);

test(
  'should process CSS with Browserslist options',
  withBrowserslist.processCSS(
    'button { color: hsla(0 100% 50% / 40%); appearance: none }',
    'button{color:#f006;appearance:none}'
  )
);

test(
  'should keep viewBox attribute in SVG from removing',
  withDefaults.processCSS(
    `a { background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><rect width="100" height="100" /></svg>'); }`,
    `a{background-image:url('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><path d="M0 0h100v100H0z"/></svg>')}`
  )
);

test(
  "should merge rules sharing identical declarations without dropping the trailing rule's unique ones",
  withDefaults.processCSS(
    `.has-errors .input {
  background-color: #fcebea;
  border-color: #cc1f1a;
}

.has-errors .checkbox-label {
  background-color: #fcebea;
  border-color: #cc1f1a;
}

.has-errors .checkbox-inline {
  background-color: #fcebea;
  border-color: #cc1f1a;
}

.error-banner .field-errors.filled {
  width: 100%;
  padding: 1.5rem 1.5rem 1rem;
  background-color: #fcebea;
  border-bottom-width: 1px;
  border-style: solid;
  border-color: #cc1f1a;
}

.error-banner .field-errors.filled   .field-error {
  width: 100%;
  font-size: .875rem;
  color: #22292f;
  line-height: 1.5;
  margin-bottom: .5rem;
}`,
    '.error-banner .field-errors.filled,.has-errors .checkbox-inline,.has-errors .checkbox-label,.has-errors .input{background-color:#fcebea;border-color:#cc1f1a}.error-banner .field-errors.filled{width:100%;padding:1.5rem 1.5rem 1rem;border-bottom-width:1px;border-style:solid}.error-banner .field-errors.filled .field-error{width:100%;font-size:.875rem;color:#22292f;line-height:1.5;margin-bottom:.5rem}'
  )
);

test(
  'should correctly handle the framework tests',
  { concurrency: true },
  integrationTests(preset, `${__dirname}/integrations`)
);

function excludeProcessor(options) {
  const input = `h1{color:black}`;

  return () =>
    loadPreset(preset(options))
      .process(input, { from: undefined })
      .then(({ css }) => {
        assert.strictEqual(css, input);
      });
}

test('exclude colormin', excludeProcessor({ colormin: false }));

test('exclude colormin #1', excludeProcessor({ colormin: { exclude: true } }));
