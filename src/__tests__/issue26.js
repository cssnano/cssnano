'use strict';

var postcss = require('postcss');
var cssnano = require('..');
var fs = require('fs');
var path = require('path');
var test = require('ava');

test('it should compress whitespace after node.clone()', function (t) {
    var fixture = fs.readFileSync(path.join(__dirname, 'issue26.css'), 'utf-8');
    var expected = fs.readFileSync(path.join(__dirname, 'issue26.expected.css'), 'utf-8');

    var processor = postcss([
        postcss.plugin('cloner', function () {
            return function (css) {
                css.walkAtRules(function (rule) {
                    css.prepend(rule.clone());
                    rule.remove();
                });
            };
        }),
        cssnano()
    ]);

    return processor.process(fixture).then(function (result) {
        t.same(result.css, expected);
    });
});
