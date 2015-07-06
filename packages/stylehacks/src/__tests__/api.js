'use strict';

import postcss from 'postcss';
import tape from 'tape';
import stylehacks from '../';
import pkg from '../../package.json';

let name = pkg.name;

tape('can be used as a postcss plugin', t => {
    t.plan(1);

    let css = 'h1 { _color: #ffffff }';

    postcss().use(stylehacks()).process(css).then(result => {
        t.equal(result.css, 'h1 { }', 'should be consumed');
    });
});

tape('can be used as a postcss plugin (2)', t => {
    t.plan(1);

    let css = 'h1 { _color: #ffffff }';

    postcss([ stylehacks() ]).process(css).then(result => {
        t.equal(result.css, 'h1 { }', 'should be consumed');
    });
});

tape('can be used as a postcss plugin (3)', t => {
    t.plan(1);

    let css = 'h1 { _color: #ffffff }';

    postcss([ stylehacks ]).process(css).then(result => {
        t.equal(result.css, 'h1 { }', 'should be consumed');
    });
});

tape('should use the postcss plugin api', t => {
    t.plan(2);
    t.ok(stylehacks().postcssVersion, 'should be able to access version');
    t.equal(stylehacks().postcssPlugin, name, 'should be able to access name');
});
