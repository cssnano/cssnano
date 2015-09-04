var test = require('tape');
var minifyWeight = require('../lib/minify-weight');

test('minify-weight', function (t) {
    t.plan(4);

    t.equal(minifyWeight('normal'), '400', 'should convert normal -> 400');
    t.equal(minifyWeight('bold'), '700', 'should convert bold -> 700');
    t.equal(minifyWeight('lighter'), 'lighter', 'shouldn\'t convert lighter');
    t.equal(minifyWeight('bolder'), 'bolder', 'shouldn\'t convert bolder');
});
