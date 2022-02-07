'use strict';
const { test } = require('uvu');
const assert = require('uvu/assert');
const postcss = require('postcss');
const nano = require('..');

function pluginMacro(instance) {
  const css = 'h1 { color: #ffffff }';
  const min = 'h1{color:#fff}';

  return () =>
    instance.process(css, { from: undefined }).then((result) => {
      assert.is(result.css, min);
    });
}

test('can be used as a postcss plugin', pluginMacro(postcss().use(nano())));

test('can be used as a postcss plugin (2)', pluginMacro(postcss([nano()])));

test('can be used as a postcss plugin (3)', pluginMacro(postcss([nano])));

test('can be used as a postcss plugin (4)', pluginMacro(postcss(nano)));

test('can be used as a postcss plugin (5)', pluginMacro(postcss().use(nano)));

test('should work with sourcemaps', () => {
  return postcss([nano])
    .process('h1{z-index:1}', { from: undefined, map: { inline: true } })
    .then(({ css }) => {
      assert.is(
        /sourceMappingURL=data:application\/json;base64/.test(css),
        true
      );
    });
});
test.run();
