'use strict';
const { test } = require('uvu');
const assert = require('uvu/assert');
const postcss = require('postcss');
const nano = require('..');

const fixture = `
div{
  grid-column: span 2;
}
p{
  columns: 2 auto;
}
`;

const expected = `div{grid-column:span 2}p{column-count:2}`;

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
    .then((r) => assert.is(r.css, expected));
});

test('it should compress the columns (new plugin syntax)', () => {
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
