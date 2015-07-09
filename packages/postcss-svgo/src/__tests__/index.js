"use strict";

import test from 'tape';
import postcss from 'postcss';
import plugin from '../';
import filters from 'pleeease-filters';
import pkg from '../../package.json';

let name = pkg.name;

let tests = [{
    message: 'should optimise inline svg',
    fixture: 'h1{background:url(\'data:image/svg+xml;utf-8,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" /><!--test comment--></svg>\')}',
    expected: 'h1{background:url(\'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#ff0"/></svg>\')}',
}, {
    message: 'should allow users to customise the output',
    fixture: 'h1{background:url(\'data:image/svg+xml;utf-8,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" /><!--test comment--></svg>\')}',
    expected: 'h1{background:url(\'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="#ff0"/><!--test comment--></svg>\')}',
    options: {plugins: [{removeComments: false}]}
}, {
    message: 'should not mangle filter effects',
    fixture: 'h1{filter:blur(5px)}',
    expected: 'h1{filter:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><filter id="filter"><feGaussianBlur stdDeviation="5" /></filter></svg>#filter\');filter:blur(5px)}'
}];

function process (css, options, callback) {
    return postcss([ filters(), plugin(options)]).process(css).then(callback);
}

test(name, (t) => {
    t.plan(tests.length);

    tests.forEach(test => {
        let options = test.options || {};
        process(test.fixture, options, result => {
            t.equal(result.css, test.expected, test.message);
        });
    });
});

test('should use the postcss plugin api', t => {
    t.plan(2);
    t.ok(plugin().postcssVersion, 'should be able to access version');
    t.equal(plugin().postcssPlugin, name, 'should be able to access name');
});
