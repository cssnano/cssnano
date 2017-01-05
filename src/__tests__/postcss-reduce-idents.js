import test from 'ava';
import processCss from './_processCss';

test(
    'should rename keyframes',
    processCss,
    '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:whiteToBlack}',
    '@keyframes a{0%{color:#fff}to{color:#000}}.one{animation-name:a}',
);

test(
    'should rename multiple keyframes',
    processCss,
    '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}@keyframes fadeOut{0%{opacity:1}to{opacity:0}}.one{animation-name:whiteToBlack}.two{animation-name:fadeOut}',
    '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{opacity:1}to{opacity:0}}.one{animation-name:a}.two{animation-name:b}',
);

test(
    'should reuse the same animation name for vendor prefixed keyframes',
    processCss,
    '@-webkit-keyframes whiteToBlack{0%{color:#fff}to{color:#000}}@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}div{-webkit-animation-name:whiteToBlack;animation-name:whiteToBlack}',
    '@-webkit-keyframes a{0%{color:#fff}to{color:#000}}@keyframes a{0%{color:#fff}to{color:#000}}div{-webkit-animation-name:a;animation-name:a}',
);

test(
    'should not touch animation names that are not defined in the file',
    processCss,
    '.one{animation-name:fadeInUp}',
    '.one{animation-name:fadeInUp}',
);

test(
    'should not touch keyframes & animation names, combined',
    processCss,
    '@keyframes whiteToBlack{0%{color:#fff}to{color:#000}}.one{animation-name:fadeInUp}',
    '.one{animation-name:fadeInUp}',
);

test(
    'should rename counter styles',
    processCss,
    '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
    '@counter-style a{system:extends decimal;suffix:"> "}ol{list-style:a}',
);

test(
    'should rename multiple counter styles & be aware of extensions',
    processCss,
    '@counter-style custom{system:extends decimal;suffix:"> "}@counter-style custom2{system:extends custom;prefix:"-"}ol{list-style:custom2}',
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends a;prefix:"-"}ol{list-style:b}',
);

test(
    'should not touch list-styles that are not defined in the file',
    processCss,
    'ol{list-style:custom2}',
    'ol{list-style:custom2}',
);

test(
    'should rename counters',
    processCss,
    'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
    'body{counter-reset:a}h3:before{counter-increment:a;content:"Section" counter(a) ": "}',
);

test(
    'should rename multiple counters',
    processCss,
    'h1:before{counter-reset:chapter 1 section page 1;content:counter(chapter) "." counter(section) " (pg." counter(page) ") "}',
    'h1:before{counter-reset:a 1 b c 1;content:counter(a) "." counter(b) " (pg." counter(c) ") "}',
);

test(
    'should not touch counters that are not outputted',
    processCss,
    'h1{counter-reset:chapter 1 section page 1}',
    'h1{counter-reset:chapter 1 section page 1}',
);

test(
    'should not touch counter functions which are not defined',
    processCss,
    'h1:before{content:counter(chapter) ". "}',
    'h1:before{content:counter(chapter) ". "}',
);
