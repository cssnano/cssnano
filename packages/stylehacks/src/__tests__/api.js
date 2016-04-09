import postcss from 'postcss';
import ava from 'ava';
import stylehacks from '../';
import {name} from '../../package.json';

ava('can be used as a postcss plugin', t => {
    let css = 'h1 { _color: #ffffff }';

    return postcss().use(stylehacks()).process(css).then(result => {
        t.deepEqual(result.css, 'h1 { }', 'should be consumed');
    });
});

ava('can be used as a postcss plugin (2)', t => {
    let css = 'h1 { _color: #ffffff }';

    return postcss([ stylehacks() ]).process(css).then(result => {
        t.deepEqual(result.css, 'h1 { }', 'should be consumed');
    });
});

ava('can be used as a postcss plugin (3)', t => {
    let css = 'h1 { _color: #ffffff }';

    return postcss([ stylehacks ]).process(css).then(result => {
        t.deepEqual(result.css, 'h1 { }', 'should be consumed');
    });
});

ava('should use the postcss plugin api', t => {
    t.truthy(stylehacks().postcssVersion, 'should be able to access version');
    t.deepEqual(stylehacks().postcssPlugin, name, 'should be able to access name');
});

ava('should have a separate detect method', t => {
    let counter = 0;

    let plugin = postcss.plugin('test', () => {
        return css => {
            css.walkDecls(decl => {
                if (stylehacks.detect(decl)) {
                    counter++;
                }
            });
        };
    });

    return postcss(plugin).process('h1 { _color: red; =color: black }').then(() => {
        t.deepEqual(counter, 2);
    });
});

ava('should have a separate detect method (2)', t => {
    let counter = 0;

    let plugin = postcss.plugin('test', () => {
        return css => {
            css.walkRules(rule => {
                if (stylehacks.detect(rule)) {
                    counter++;
                }
            });
        };
    });

    return postcss(plugin).process('h1 { _color: red; =color: black }').then(() => {
        t.deepEqual(counter, 0);
    });
});
