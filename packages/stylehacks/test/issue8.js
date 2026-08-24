import nodetest from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import stylehacks from '../src/index.js';

const { test } = nodetest;
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
