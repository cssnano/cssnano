module.exports.name = 'cssnano/postcss-discard-empty';
module.exports.tests = [{
    message: 'should remove empty @ rules',
    fixture: '@font-face;',
    expected: '',
}, {
    message: 'should remove empty @ rules (2)',
    fixture: '@font-face {}',
    expected: '',
}, {
    message: 'should not mangle @ rules with parameters',
    fixture: '@charset "utf-8";',
    expected: '@charset "utf-8";',
    options: {normalizeCharset: false},
}, {
    message: 'should remove empty rules',
    fixture: 'h1{}h2{}h4{}h5,h6{}',
    expected: '',
}, {
    message: 'should remove empty declarations',
    fixture: 'h1{color:}',
    expected: '',
}, {
    message: 'should remove null selectors',
    fixture: '{color:blue}',
    expected: '',
}, {
    message: 'should remove null selectors in media queries',
    fixture: '@media screen, print {{}}',
    expected: '',
}, {
    message: 'should remove empty media queries',
    fixture: '@media screen, print {h1,h2{}}',
    expected: '',
}];
