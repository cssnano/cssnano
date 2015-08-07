module.exports.name = 'cssnano/postcss-colormin';
module.exports.tests = [{
    message: 'should minify color values',
    fixture: 'h1{color:yellow}',
    expected: 'h1{color:#ff0}'
}, {
    message: 'should minify color values (2)',
    fixture: 'h1{box-shadow:0 1px 3px rgba(255, 230, 220, 0.5)}',
    expected: 'h1{box-shadow:0 1px 3px rgba(255,230,220,.5)}'
}, {
    message: 'should minify color values (3)',
    fixture: 'h1{background:hsla(134, 50%, 50%, 1)}',
    expected: 'h1{background:#40bf5e}'
}, {
    message: 'should minify color values (4)',
    fixture: 'h1{text-shadow:1px 1px 2px #000000}',
    expected: 'h1{text-shadow:1px 1px 2px #000}'
}, {
    message: 'should minify color values in background gradients',
    fixture: 'h1{background:linear-gradient(#ff0000,yellow)}',
    expected: 'h1{background:linear-gradient(red,#ff0)}'
}, {
    message: 'should minify color values in background gradients (2)',
    fixture: 'h1{background:linear-gradient(yellow, orange), linear-gradient(black, rgba(255, 255, 255, 0))}',
    expected: 'h1{background:linear-gradient(#ff0,orange),linear-gradient(#000,hsla(0,0%,100%,0))}'
}, {
    message: 'should minify color values in background gradients (3)',
    fixture: 'h1{background:linear-gradient(0deg, yellow, black 40%, red)}',
    expected: 'h1{background:linear-gradient(0deg,#ff0,#000 40%,red)}'
}, {
    message: 'should not minify in font properties',
    fixture: 'h1{font-family:black}',
    expected: 'h1{font-family:black}'
}, {
    message: 'should correctly parse multiple box shadow values',
    fixture: 'h1{box-shadow:inset 0 1px 1px rgba(0, 0, 0, .075),0 0 8px rgba(102, 175, 233, .6)}',
    expected: 'h1{box-shadow:inset 0 1px 1px rgba(0,0,0,.075),0 0 8px rgba(102,175,233,.6)}'
}];
