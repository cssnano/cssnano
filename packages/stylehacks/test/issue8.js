'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const postcss = require('postcss');
const stylehacks = require('..');

const insertZoom = () => {
  return {
    postcssPlugin: 'insertZoom',
    Once(root) {
      root.first.append(postcss.decl({ prop: '*zoom', value: '1' }));
    },
  };
};
insertZoom.postcss = true;

test('should remove star hack from plugins like lost', () => {
  return postcss([insertZoom(), stylehacks()])
    .process('h1{}', { overrideBrowserslist: 'IE 8', from: undefined })
    .then((result) => assert.strictEqual(result.css, 'h1{}'));
});
