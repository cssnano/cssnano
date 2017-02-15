import test from 'ava';
import processCss from './_processCss';

test(
    'should remove unused counter styles',
    processCss,
    '@counter-style custom{system:extends decimal;suffix:"> "}',
    '',
);

test(
    'should be aware of extensions',
    processCss,
    '@counter-style custom{system:extends decimal;suffix:"> "}@counter-style custom2{system:extends custom;suffix:"| "}a{list-style: custom2}',
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends a;suffix:"| "}a{list-style:b}',
);

test(
    'should remove unused counters & keep used counters',
    processCss,
    '@counter-style custom{system:extends decimal;suffix:"> "}@counter-style custom2{system:extends decimal;suffix:"| "}a{list-style: custom2}',
    '@counter-style a{system:extends decimal;suffix:"| "}a{list-style:a}',
);

test(
    'should remove counter styles if they have no identifier',
    processCss,
    '@counter-style {system:extends decimal;suffix:"> "}',
    '',
);

test(
    'should remove unused keyframes',
    processCss,
    '@keyframes fadeOut{0%{opacity:1}to{opacity:0}}',
    '',
);

test(
    'should remove unused keyframes & keep used keyframes',
    processCss,
    '@keyframes fadeOut{0%{opacity:1}to{opacity:0}}@keyframes fadeIn{0%{opacity:0}to{opacity:1}}a{animation-name:fadeIn}',
    '@keyframes a{0%{opacity:0}to{opacity:1}}a{animation-name:a}',
);

test(
    'should remove keyframes if they have no identifier',
    processCss,
    '@keyframes {0%{opacity:0}to{opacity:1}}',
    '',
);

test(
    'should remove unused fonts',
    processCss,
    '@font-face {font-family:"Does Not Exist";src:url("fonts/does-not-exist.ttf") format("truetype")}',
    '',
);

test(
    'should remove unused fonts (2)',
    processCss,
    '@font-face {font-family:"Does Not Exist";src:url("fonts/does-not-exist.ttf") format("truetype")}@font-face {font-family:"Does Exist";src: url("fonts/does-exist.ttf") format("truetype")}',
    '',
);

test(
    'should remove unused fonts & keep used fonts',
    processCss,
    '@font-face {font-family:"Does Not Exist";src:url("fonts/does-not-exist.ttf") format("truetype")}@font-face {font-family:"Does Exist";src: url("fonts/does-exist.ttf") format("truetype")}body{font-family:"Does Exist",Helvetica,Arial,sans-serif}',
    '@font-face{font-family:Does Exist;src:url(fonts/does-exist.ttf) format("truetype")}body{font-family:Does Exist,Helvetica,Arial,sans-serif}',
);

test(
    'should work with the font shorthand',
    processCss,
    '@font-face {font-family:"Does Exist";src: url("fonts/does-exist.ttf") format("truetype")}body{font: 10px/1.5 "Does Exist",Helvetica,Arial,sans-serif}',
    '@font-face{font-family:Does Exist;src:url(fonts/does-exist.ttf) format("truetype")}body{font:10px/1.5 Does Exist,Helvetica,Arial,sans-serif}',
);

test(
    'should remove font faces if they have no font-family property',
    processCss,
    '@font-face {src:url(fonts/does-not-exist.ttf) format("truetype")}',
    '',
);
