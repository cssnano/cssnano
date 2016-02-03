module.exports.name = 'cssnano/postcss-minify-font-values';
module.exports.tests = [{
    message: 'should convert normal to 400',
    fixture: 'h1{font-weight: normal}',
    expected: 'h1{font-weight:400}'
}, {
    message: 'should convert bold to 700',
    fixture: 'h1{font-weight: bold}',
    expected: 'h1{font-weight:700}'
}, {
    message: 'should not update the font-style property',
    fixture: 'h1{font-style: normal}',
    expected: 'h1{font-style:normal}'
}];
