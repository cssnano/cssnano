import postcss from 'postcss';
import plugin from '..';

export default function processCss (t, fixture, expected) {
    return postcss(plugin).process(fixture).then(({css}) => {
        if (!expected) {
            return t.deepEqual(css, fixture);
        }
        t.deepEqual(css, expected);
    });
}
