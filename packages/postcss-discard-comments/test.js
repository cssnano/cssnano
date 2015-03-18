var test = require('tape');
var postcss = require('postcss');
var plugin = require('./');

var tests = [{
    message: 'should remove non-special comments',
    fixture: 'h1{font-weight:bold!important/*test comment*/}',
    expected: 'h1{font-weight:bold!important}'
}, {
    message: 'should remove non-special comments 2',
    fixture: 'h1{/*test comment*/font-weight:bold}',
    expected: 'h1{font-weight:bold}'
}, {
    message: 'should remove non-special comments 3',
    fixture: '/*test comment*/h1{font-weight:bold}/*test comment*/',
    expected: 'h1{font-weight:bold}'
}, {
    message: 'should remove non-special comments 4',
    fixture: 'h1{font-weight:/*test comment*/bold}',
    expected: 'h1{font-weight:bold}'
}, {
    message: 'should remove non-special comments 5',
    fixture: 'h1{margin:10px/*test*/20px}',
    expected: 'h1{margin:10px 20px}'
}, {
    message: 'should remove non-special comments 6',
    fixture: 'h1{margin:10px /*test*/ 20px /*test*/ 10px /*test*/ 20px}',
    expected: 'h1{margin:10px 20px 10px 20px}'
}, {
    message: 'should remove non-special comments 7',
    fixture: '/*comment*/*/*comment*/{margin:10px}',
    expected:'*{margin:10px}'
}, {
    message: 'should remove non-special comments 8',
    fixture: 'h1,/*comment*/ h2, h3/*comment*/{margin:20px}',
    expected: 'h1, h2, h3{margin:20px}'
}, {
    message: 'should remove non-special comments 9',
    fixture: '@keyframes /*test*/ fade{0%{opacity:0}100%{opacity:1}}',
    expected: '@keyframes fade{0%{opacity:0}100%{opacity:1}}'
}, {
    message: 'should remove non-special comments 10',
    fixture: '@media only screen /*desktop*/ and (min-width:900px){body{margin:0 auto;}}',
    expected: '@media only screen and (min-width:900px){body{margin:0 auto;}}'
}, {
    message: 'should remove non-special comments 11',
    fixture: '@media only screen and (min-width:900px)/*test*/{body{margin:0 auto;}}',
    expected: '@media only screen and (min-width:900px){body{margin:0 auto;}}',
}, {
    message: 'should remove non-special comments 12',
    fixture: 'h1{margin/*test*/:20px}',
    expected: 'h1{margin:20px}'
}, {
    message: 'should keep special comments',
    fixture: 'h1{font-weight:bold!important/*!test comment*/}',
    expected: 'h1{font-weight:bold!important/*!test comment*/}'
}, {
    message: 'should keep special comments 2',
    fixture: 'h1{/*!test comment*/font-weight:bold}',
    expected: 'h1{/*!test comment*/font-weight:bold}'
}, {
    message: 'should keep special comments 3',
    fixture: '/*!test comment*/h1{font-weight:bold}/*!test comment*/',
    expected: '/*!test comment*/h1{font-weight:bold}/*!test comment*/'
}, {
    message: 'should keep special comments 4',
    fixture: 'h1{font-weight:/*!test comment*/bold}',
    expected: 'h1{font-weight:/*!test comment*/bold}'
}, {
    message: 'should keep special comments 5',
    fixture: 'h1{margin:10px/*!test*/20px}',
    expected: 'h1{margin:10px/*!test*/20px}'
}, {
    message: 'should keep special comments 6',
    fixture: 'h1{margin:10px /*!test*/ 20px /*!test*/ 10px /*!test*/ 20px}',
    expected: 'h1{margin:10px /*!test*/ 20px /*!test*/ 10px /*!test*/ 20px}'
}, {
    message: 'should keep special comments 7',
    fixture: '/*!comment*/*/*!comment*/{margin:10px}',
    expected:'/*!comment*/*/*!comment*/{margin:10px}'
}, {
    message: 'should keep special comments 8',
    fixture: 'h1,/*!comment*/ h2, h3/*!comment*/{margin:20px}',
    expected: 'h1,/*!comment*/ h2, h3/*!comment*/{margin:20px}'
}, {
    message: 'should keep special comments 9',
    fixture: '@keyframes /*!test*/ fade{0%{opacity:0}100%{opacity:1}}',
    expected: '@keyframes /*!test*/ fade{0%{opacity:0}100%{opacity:1}}'
}, {
    message: 'should keep special comments 10',
    fixture: '@media only screen /*!desktop*/ and (min-width:900px){body{margin:0 auto;}}',
    expected: '@media only screen /*!desktop*/ and (min-width:900px){body{margin:0 auto;}}'
}, {
    message: 'should keep special comments 11',
    fixture: '@media only screen and (min-width:900px)/*!test*/{body{margin:0 auto;}}',
    expected: '@media only screen and (min-width:900px)/*!test*/{body{margin:0 auto;}}',
}, {
    message: 'should keep special comments 12',
    fixture: 'h1{margin/*!test*/:20px}',
    expected: 'h1{margin/*!test*/:20px}'
}, {
    message: 'should remove all important comments, with a flag',
    fixture: '/*!license*/h1{font-weight:bold}/*!license 2*/h2{color:#000}',
    expected: 'h1{font-weight:bold}h2{color:#000}',
    options: {removeAll: true}
}, {
    message: 'should remove all important comments but the first, with a flag',
    fixture: '/*!license*/h1{font-weight:bold}/*!license 2*/h2{color:#000}',
    expected: '/*!license*/h1{font-weight:bold}h2{color:#000}',
    options: {removeAllButFirst: true}
}, {
    message: 'should pass through when it doesn\'t find a comment',
    fixture: 'h1{color:black;font-weight:bold}',
    expected: 'h1{color:black;font-weight:bold}'
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
