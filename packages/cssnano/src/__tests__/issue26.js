'use strict';
const { test } = require('uvu');
const assert = require('uvu/assert');
const postcss = require('postcss');
const nano = require('..');

const fixture = `
@media print {
    .test {
        -webkit-border-radius: 0;
        border-radius: 0;
    }
}

@media print {
    .test {
        -webkit-box-shadow: none;
        box-shadow: none;
    }
}

.test {
    width: 500px;
}
`;

const expected = `@media print{.test{-webkit-border-radius:0;border-radius:0;-webkit-box-shadow:none;box-shadow:none}}.test{width:500px}`;

test('it should compress whitespace after node.clone()', () => {
  const plugin = () => {
    return {
      postcssPlugin: 'cloner',
      Once(root) {
        root.walkAtRules((rule) => {
          root.prepend(rule.clone());
          rule.remove();
        });
      },
    };
  };
  plugin.postcss = true;

  const processor = postcss([plugin, nano()]);

  return processor
    .process(fixture, { from: undefined })
    .then((r) => assert.is(r.css, expected));
});
test.run();
