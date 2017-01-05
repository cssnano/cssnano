import test from 'ava';
import processCss from './_processCss';

test(
    'should discard overridden rules',
    processCss,
    '@keyframes a{0%{opacity:1}to{opacity:0}}@keyframes a{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}.box{animation-name:a}',
    '@keyframes a{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}.box{animation-name:a}',
);

test(
    'should discard overridden rules in media queries',
    processCss,
    '@media screen and (max-width:500px){@keyframes a{0%{opacity:1}to{opacity:0}}@keyframes a{0%{transform:rotate(0deg)}to{transform:rotate(358deg)}}}@keyframes a{0%{opacity:1}to{opacity:0}}@keyframes a{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}.box{animation-name:a}',
    '@media screen and (max-width:500px){@keyframes a{0%{transform:rotate(0deg)}to{transform:rotate(358deg)}}}@keyframes a{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}.box{animation-name:a}',
);
