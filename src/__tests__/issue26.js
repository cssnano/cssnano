import {join} from 'path';
import {readFileSync as file} from 'fs';
import postcss from 'postcss';
import nano from '..';
import ava from 'ava';

ava('it should compress whitespace after node.clone()', t => {
    const fixture = file(join(__dirname, 'issue26.css'), 'utf-8');
    const expected = file(join(__dirname, 'issue26.expected.css'), 'utf-8');

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
