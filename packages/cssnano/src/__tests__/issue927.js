import postcss from 'postcss';
import nano from '..';

const fixture = `
div{
  grid-column: span 2;
}
p{
  columns: 2 auto;
}
`;

const expected = `div{grid-column:span 2}p{column-count:2}`;

test('it should compress the columns', () => {
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
    .then((r) => expect(r.css).toBe(expected));
});
