import nodetest from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import nano from '../src/index.js';

const { test } = nodetest;
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

const expected = `@media print{.test{-webkit-box-shadow:none;box-shadow:none;-webkit-border-radius:0;border-radius:0}}.test{width:500px}`;

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

test('it should compress whitespace after node.clone()', () => {
  const processor = postcss([plugin, nano()]);

  return processor
    .process(fixture, { from: undefined })
    .then((r) => assert.strictEqual(r.css, expected));
});
