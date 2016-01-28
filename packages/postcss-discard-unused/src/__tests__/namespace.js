'use strict';

import test from 'tape';
import postcss from 'postcss';
import plugin from '..';

let tests = [{
    message: 'should remove unused prefixed namespace',
    fixture: '@namespace svg url(http://www.w3.org/2000/svg);a{color:blue}',
    expected: 'a{color:blue}'
}, {
    message: 'should remove invalid namespace',
    fixture: '@namespace',
    expected: ''
}, {
    message: 'shouldn\'t remove default namespace',
    fixture: '@namespace url(http://www.w3.org/2000/svg)',
    expected: '@namespace url(http://www.w3.org/2000/svg)'
}, {
    message: 'shouldn\'t remove used prefixed namespace',
    fixture: '@namespace svg url(http://www.w3.org/2000/svg);svg|a{color:blue}',
    expected: '@namespace svg url(http://www.w3.org/2000/svg);svg|a{color:blue}'
}, {
    message: 'shouldn\'t remove prefixed namespace in case of universal selector',
    fixture: '@namespace svg url(http://www.w3.org/2000/svg);*|a{color:blue}',
    expected: '@namespace svg url(http://www.w3.org/2000/svg);*|a{color:blue}'
}, {
    message: 'shouldn\'t remove unused prefixed namespace',
    fixture: '@namespace svg url(http://www.w3.org/2000/svg)',
    expected: '@namespace svg url(http://www.w3.org/2000/svg)',
    options: {
        namespace: false
    }
}];

function process (css, options) {
    return postcss(plugin(options)).process(css).css;
}

test('namespace at-rule', t => {
    t.plan(tests.length);

    tests.forEach(test => {
        let options = test.options || {};
        t.equal(process(test.fixture, options), test.expected, test.message);
    });
});
