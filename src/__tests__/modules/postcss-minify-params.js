module.exports.name = 'cssnano/postcss-minify-selectors';
module.exports.tests = [{
    message: 'should normalise @media queries (2)',
    fixture: '@media only screen \n and ( min-width: 400px, min-height: 500px ){h1{color:blue}}',
    expected: '@media only screen and (min-width:400px,min-height:500px){h1{color:blue}}',
}];
