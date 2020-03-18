import postcss from 'postcss';
import nano from '..';

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
