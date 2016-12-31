module.exports.name = 'autoprefixer';
module.exports.tests = [{
    message: 'should remove outdated vendor prefixes',
    fixture: 'h1{-webkit-box-sizing:content-box;box-sizing:content-box}',
    expected: 'h1{box-sizing:content-box}',
}, {
    message: 'should not remove outdated vendor prefixes when minifying for older browsers',
    fixture: 'h1{-webkit-box-sizing:content-box;box-sizing:content-box}',
    expected: 'h1{-webkit-box-sizing:content-box;box-sizing:content-box}',
    options: {browsers: 'Safari < 5'},
}, {
    message: 'should not remove outdated vendor prefixes if disabled',
    fixture: 'h1{-webkit-box-sizing:content-box;box-sizing:content-box}',
    expected: 'h1{-webkit-box-sizing:content-box;box-sizing:content-box}',
    options: {autoprefixer: false},
}];
