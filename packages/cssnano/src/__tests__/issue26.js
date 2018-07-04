import postcss from 'postcss';
import nano from '..';
import ava from 'ava';

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

const expected = `@media print{.test{-webkit-border-radius:0;-webkit-box-shadow:none;border-radius:0;box-shadow:none}}.test{width:500px}`;

ava('it should compress whitespace after node.clone()', t => {
    const processor = postcss([
        postcss.plugin('cloner', () => {
            return css => {
                css.walkAtRules(rule => {
                    css.prepend(rule.clone());
                    rule.remove();
                });
            };
        }),
        nano(),
    ]);

    return processor.process(fixture).then(r => t.deepEqual(r.css, expected));
});
