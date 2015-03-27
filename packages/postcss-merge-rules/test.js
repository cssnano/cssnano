var test = require('tape');
var postcss = require('postcss');
var plugin = require('./');

var tests = [{
    message: 'should merge based on declarations',
    fixture: 'h1{display:block}h2{display:block}',
    expected: 'h1,h2{display:block}'
}, {
    message: 'should merge based on declarations (2)',
    fixture: 'h1{color:red;line-height:1.5;font-size:2em}h2{color:red;line-height:1.5;font-size:2em}',
    expected: 'h1,h2{color:red;line-height:1.5;font-size:2em}'
}, {
    message: 'should merge based on selectors',
    fixture: 'h1{display:block}h1{text-decoration:underline}',
    expected: 'h1{display:block;text-decoration:underline}'
}, {
    message: 'should merge based on selectors (2)',
    fixture: 'h1{color:red;display:block}h1{text-decoration:underline}',
    expected: 'h1{color:red;display:block;text-decoration:underline}'
}, {
    message: 'should merge based on selectors (3)',
    fixture: 'h1{font-size:2em;color:#000}h1{background:#fff;line-height:1.5}',
    expected: 'h1{font-size:2em;color:#000;background:#fff;line-height:1.5}'
}, {
    message: 'should merge in media queries',
    fixture: '@media print{h1{display:block}h1{color:red}}',
    expected: '@media print{h1{display:block;color:red}}'
}, {
    message: 'should merge in media queries (2)',
    fixture: '@media print{h1{display:block}p{display:block}}',
    expected: '@media print{h1,p{display:block}}'
}, {
    message: 'should merge in media queries (3)',
    fixture: '@media print{h1{color:red;text-decoration:none}h2{text-decoration:none}}h3{text-decoration:none}',
    expected: '@media print{h1{color:red}h1,h2{text-decoration:none}}h3{text-decoration:none}'
}, {
    message: 'should merge in media queries (4)',
    fixture: 'h3{text-decoration:none}@media print{h1{color:red;text-decoration:none}h2{text-decoration:none}}',
    expected: 'h3{text-decoration:none}@media print{h1{color:red}h1,h2{text-decoration:none}}'
}, {
    message: 'should not merge in different contexts',
    fixture: 'h1{display:block}@media print{h1{color:red}}',
    expected: 'h1{display:block}@media print{h1{color:red}}'
}, {
    message: 'should not merge in different contexts (2)',
    fixture: '@media print{h1{display:block}}h1{color:red}',
    expected: '@media print{h1{display:block}}h1{color:red}'
}, {
    message: 'should perform partial merging of selectors',
    fixture: 'h1{color:red}h2{color:red;text-decoration:underline}',
    expected: 'h1,h2{color:red}h2{text-decoration:underline}'
}, {
    message: 'should perform partial merging of selectors (2)',
    fixture: 'h1{color:red}h2{color:red;text-decoration:underline}h3{color:green;text-decoration:underline}',
    expected: 'h1,h2{color:red}h2,h3{text-decoration:underline}h3{color:green}'
}, {
    message: 'should perform partial merging of selectors (3)',
    fixture: 'h1{color:red;text-decoration:underline}h2{text-decoration:underline;color:green}h3{font-weight:bold;color:green}',
    expected: 'h1{color:red}h1,h2{text-decoration:underline}h2,h3{color:green}h3{font-weight:bold}'
}, {
    message: 'should perform partial merging of selectors (4)',
    fixture: '.test0{color:red;border:none;margin:0}.test1{color:green;border:none;margin:0}',
    expected: '.test0{color:red}.test0,.test1{border:none;margin:0}.test1{color:green}'
}, {
    message: 'should perform partial merging of selectors (5)',
    fixture: 'h1{color:red;font-weight:bold}h2{font-weight:bold}h3{text-decoration:none}',
    expected: 'h1{color:red}h1,h2{font-weight:bold}h3{text-decoration:none}'
}, {
    message: 'should not perform partial merging of selectors if the output would be longer',
    fixture: '.test0{color:red;border:none;margin:0}.longlonglong{color:green;border:none;margin:0}',
    expected: '.test0{color:red;border:none;margin:0}.longlonglong{color:green;border:none;margin:0}'
}, {
    message: 'should merge vendor prefixed selectors when vendors are the same',
    fixture: 'code ::-moz-selection{background:red}code::-moz-selection{background:red}',
    expected: 'code ::-moz-selection,code::-moz-selection{background:red}'
}, {
    message: 'should not merge mixed vendor prefixes',
    fixture: 'code ::-webkit-selection{background:red}code::-moz-selection{background:red}',
    expected: 'code ::-webkit-selection{background:red}code::-moz-selection{background:red}'
}, {
    message: 'should not merge mixed vendor prefixed and non-vendor prefixed',
    fixture: 'code ::selection{background:red}code ::-moz-selection{background:red}',
    expected: 'code ::selection{background:red}code ::-moz-selection{background:red}'
}, {
    message: 'should not be responsible for deduping declarations when merging',
    fixture: 'h1{display:block;display:block}h2{display:block;display:block}',
    expected: 'h1,h2{display:block;display:block}'
}, {
    message: 'should not be responsible for deduping selectors when merging',
    fixture: 'h1,h2{display:block}h2,h1{display:block}',
    expected: 'h1,h2,h2,h1{display:block}'
}];

function process (css, options) {
    return postcss(plugin(options)).process(css).css;
}

test(require('./package.json').name, function (t) {
    t.plan(tests.length);

    tests.forEach(function (test) {
        var options = test.options || {};
        t.equal(process(test.fixture, options), test.expected, test.message);
    });
});
