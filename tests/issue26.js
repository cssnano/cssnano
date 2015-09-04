'use strict';

var postcss = require('postcss');
var cssnano = require('..');
var fs = require('fs');
var path = require('path');
var test = require('tape');

test('it should compress whitespace after node.clone()', function (t) {
    t.plan(1);

    var css = fs.readFileSync(path.join(__dirname, 'issue26.css'), 'utf-8');
    var expected = fs.readFileSync(path.join(__dirname, 'issue26.expected.css'), 'utf-8');

    var processor = postcss([
      postcss.plugin('cloner', function () {
        return function (css, result) {
          css.walkAtRules(function (rule) {
            css.prepend(rule.clone());
            rule.remove();
          });
        };
      }),
      cssnano()
    ]);

    processor.process(css).then(function (result) {
      t.equal(result.css, expected);
    });
});
