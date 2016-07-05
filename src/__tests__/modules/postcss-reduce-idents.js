module.exports.name = 'cssnano/postcss-reduce-idents';
module.exports.tests = [{
    message: 'should rename keyframes',
    fixture: '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
    expected: '@keyframes a{0%{color:#fff}to{color:#000}}.one{animation-name:a}',
}, {
    message: 'should rename multiple keyframes',
    fixture: '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}@keyframes fadeOut{0%{opacity:1}to{opacity:0}}.one{animation-name:whiteToBlack}.two{animation-name:fadeOut}',
    expected: '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{opacity:1}to{opacity:0}}.one{animation-name:a}.two{animation-name:b}',
}, {
    message: 'should reuse the same animation name for vendor prefixed keyframes',
    fixture: '@-webkit-keyframes whiteToBlack{0%{color:#fff}to{color:#000}}@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}div{-webkit-animation-name:whiteToBlack;animation-name:whiteToBlack}',
    expected: '@-webkit-keyframes a{0%{color:#fff}to{color:#000}}@keyframes a{0%{color:#fff}to{color:#000}}div{-webkit-animation-name:a;animation-name:a}',
}, {
    message: 'should not touch animation names that are not defined in the file',
    fixture: '.one{animation-name:fadeInUp}',
    expected: '.one{animation-name:fadeInUp}',
}, {
    message: 'should not touch keyframes & animation names, combined',
    fixture: '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:fadeInUp}',
    expected: '.one{animation-name:fadeInUp}',
}, {
    message: 'should rename counter styles',
    fixture: '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
    expected: '@counter-style a{system:extends decimal;suffix:"> "}ol{list-style:a}',
}, {
    message: 'should rename multiple counter styles & be aware of extensions',
    fixture: '@counter-style custom{system:extends decimal;suffix:"> "}@counter-style custom2{system:extends custom;prefix:"-"}ol{list-style:custom2}',
    expected: '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends a;prefix:"-"}ol{list-style:b}',
}, {
    message: 'should not touch list-styles that are not defined in the file',
    fixture: 'ol{list-style:custom2}',
    expected: 'ol{list-style:custom2}',
}, {
    message: 'should rename counters',
    fixture: 'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
    expected: 'body{counter-reset:a}h3:before{counter-increment:a;content:"Section" counter(a) ": "}',
}, {
    message: 'should rename multiple counters',
    fixture: 'h1:before{counter-reset:chapter 1 section page 1;content:counter(chapter) "." counter(section) " (pg." counter(page) ") "}',
    expected: 'h1:before{counter-reset:a 1 b c 1;content:counter(a) "." counter(b) " (pg." counter(c) ") "}',
}, {
    message: 'should not touch counters that are not outputted',
    fixture: 'h1{counter-reset:chapter 1 section page 1}',
    expected: 'h1{counter-reset:chapter 1 section page 1}',
}, {
    message: 'should not touch counter functions which are not defined',
    fixture: 'h1:before{content:counter(chapter) ". "}',
    expected: 'h1:before{content:counter(chapter) ". "}',
}];
