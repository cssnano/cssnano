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
    .then((r) => expect(r.css).toBe(expected));
});
