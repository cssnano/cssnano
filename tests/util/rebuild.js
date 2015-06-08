var nano = require('../../');
var directory = require('fs').readdirSync;
var file = require('fs').readFileSync;
var write = require('fs').writeFileSync;
var postcss = require('postcss');
var formatter = require('./formatter');
var path = require('path');
var base = path.join(__dirname, '../integrations');

function formatted (css) {
    return postcss().use(nano()).use(formatter).process(css).css;
}

directory(base).forEach(function (f) {
    if (~f.indexOf('fixture')) {
        write(
            path.join(base, f.replace('fixture', 'expected')),
            formatted(file(base + '/' + f))
        );
    }
});
