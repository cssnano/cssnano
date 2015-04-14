var test = require('tape');
var nano = require('../');
var directory = require('fs').readdirSync;
var file = require('fs').readFileSync;
var postcss = require('postcss');
var specName = require('./util/specName');
var formatter = require('./util/formatter');
var path = require('path');

var base = path.join(__dirname, 'integrations');

function formatted (css) {
    return postcss().use(nano()).use(formatter).process(css).css;
}

test('integration testing', function (t) {
    var specs = directory(base).reduce(function (tests, cssFile) {
        var parts = cssFile.split('.');
        if (!tests[parts[0]]) {
            tests[parts[0]] = {};
        }
        tests[parts[0]][parts[1]] = file(path.join(base, cssFile), 'utf-8');
        return tests;
    }, {});

    t.plan(Object.keys(specs).length);

    Object.keys(specs).forEach(function (name) {
        var spec = specs[name];
        var testName = 'produceTheExpectedResultFor: ' + name + '.css';
        t.equal(formatted(spec.fixture), spec.expected, specName(testName));
    });
});
