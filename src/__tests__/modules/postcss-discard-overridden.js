module.exports.name = 'cssnano/postcss-discard-overridden';
module.exports.tests = [{
    message: 'should discard overridden rules',
    fixture: '@keyframes a{0%{opacity:1}to{opacity:0}}@keyframes a{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}.box{animation-name:a}',
    expected: '@keyframes a{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}.box{animation-name:a}',
}, {
    message: 'should discard overridden rules in media queries',
    fixture: '@media screen and (max-width:500px){@keyframes a{0%{opacity:1}to{opacity:0}}@keyframes a{0%{transform:rotate(0deg)}to{transform:rotate(358deg)}}}@keyframes a{0%{opacity:1}to{opacity:0}}@keyframes a{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}.box{animation-name:a}',
    expected: '@media screen and (max-width:500px){@keyframes a{0%{transform:rotate(0deg)}to{transform:rotate(358deg)}}}@keyframes a{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}.box{animation-name:a}',
}];
