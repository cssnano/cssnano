import nodetest from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import nano from '../src/index.js';

const { test } = nodetest;
const fixture = `
div{
  grid-column: span 2;
}
p{
  columns: 2 auto;
}
`;

const expected = `div{grid-column:span 2}p{columns:2}`;

test('it should compress the columns (old plugin syntax)', () => {
  const processor = postcss([
    postcss.plugin('cloner', () => {
      return (css) => {
        css.walkAtRules((rule) => {
          css.prepend(rule.clone());
          rule.remove();
        });
      };
    }),
    nano(),
  ]);

  return processor
    .process(fixture, { from: undefined })
    .then((r) => assert.strictEqual(r.css, expected));
});

const clonerPlugin = () => {
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
clonerPlugin.postcss = true;

test('it should compress the columns (new plugin syntax)', () => {
  const processor = postcss([clonerPlugin, nano()]);

  return processor
    .process(fixture, { from: undefined })
    .then((r) => assert.strictEqual(r.css, expected));
});
