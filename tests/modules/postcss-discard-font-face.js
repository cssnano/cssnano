module.exports.name = 'css-nano/postcss-discard-font-face';
module.exports.tests = [{
    message: 'should remove unused fonts',
    fixture: '@font-face {font-family:"Does Not Exist";src:url("fonts/does-not-exist.ttf") format("truetype")}',
    expected: ''
}, {
    message: 'should remove unused fonts (2)',
    fixture: '@font-face {font-family:"Does Not Exist";src:url("fonts/does-not-exist.ttf") format("truetype")}@font-face {font-family:"Does Exist";src: url("fonts/does-exist.ttf") format("truetype")}',
    expected: ''
}, {
    message: 'should remove unused fonts & keep used fonts',
    fixture: '@font-face {font-family:"Does Not Exist";src:url("fonts/does-not-exist.ttf") format("truetype")}@font-face {font-family:"Does Exist";src: url("fonts/does-exist.ttf") format("truetype")}body{font-family:"Does Exist",Helvetica,Arial,sans-serif}',
    expected: '@font-face{font-family:Does Exist;src:url("fonts/does-exist.ttf") format("truetype")}body{font-family:Does Exist,Helvetica,Arial,sans-serif}',
}, {
    message: 'should work with the font shorthand',
    fixture: '@font-face {font-family:"Does Exist";src: url("fonts/does-exist.ttf") format("truetype")}body{font: 10px/1.5 "Does Exist",Helvetica,Arial,sans-serif}',
    expected: '@font-face{font-family:Does Exist;src:url("fonts/does-exist.ttf") format("truetype")}body{font:10px/1.5 "Does Exist",Helvetica,Arial,sans-serif}'
}, {
    message: 'should remove font faces if they have no font-family property',
    fixture: '@font-face {src:url("fonts/does-not-exist.ttf") format("truetype")}',
    expected: ''
}];
