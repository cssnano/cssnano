'use strict';
const { test } = require('uvu');
const assert = require('uvu/assert');
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
    .process('h1{}', { env: 'ie8', from: undefined })
    .then((result) => assert.is(result.css, 'h1{}'));
});
test.run();
