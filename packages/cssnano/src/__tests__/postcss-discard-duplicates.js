import test from 'ava';
import processCss from './_processCss';

test(
    'should remove duplicate rules',
    processCss,
    'h1{font-weight:700}h1{font-weight:700}',
    'h1{font-weight:700}',
);

test(
    'should remove duplicate declarations',
    processCss,
    'h1{font-weight:700;font-weight:700}',
    'h1{font-weight:700}',
);

test(
    'should remove duplicate @rules',
    processCss,
    '@charset "utf-8";@charset "utf-8";',
    '@charset "utf-8";',
    {normalizeCharset: false},
);

test(
    'should remove duplicates inside @media queries',
    processCss,
    '@media print{h1{display:block}h1{display:block}}',
    '@media print{h1{display:block}}',
);

test(
    'should remove duplicate @media queries',
    processCss,
    '@media print{h1{display:block}}@media print{h1{display:block}}',
    '@media print{h1{display:block}}',
);

test(
    'should not mangle same keyframe rules but with different vendors',
    processCss,
    '@-webkit-keyframes flash{0%,50%,100%{opacity:1}25%,75%{opacity:0}}@keyframes flash{0%,50%,100%{opacity:1}25%,75%{opacity:0}}a{animation:flash}',
    '@-webkit-keyframes a{0%,50%,to{opacity:1}25%,75%{opacity:0}}@keyframes a{0%,50%,to{opacity:1}25%,75%{opacity:0}}a{animation:a}',
);

test(
    'should not merge across keyframes',
    processCss,
    '@-webkit-keyframes test{0%{color:#000}to{color:#fff}}@keyframes test{0%{color:#000}to{color:#fff}}a{animation:test}',
    '@-webkit-keyframes a{0%{color:#000}to{color:#fff}}@keyframes a{0%{color:#000}to{color:#fff}}a{animation:a}',
);

test(
    'should not merge across keyframes (2)',
    processCss,
    '@-webkit-keyframes slideInDown{0%{-webkit-transform:translateY(-100%);transform:translateY(-100%);visibility:visible}to{-webkit-transform:translateY(0);transform:translateY(0)}}@keyframes slideInDown{0%{-webkit-transform:translateY(-100%);transform:translateY(-100%);visibility:visible}to{-webkit-transform:translateY(0);transform:translateY(0)}}a{animation:slideInDown}',
    '@-webkit-keyframes a{0%{-webkit-transform:translateY(-100%);transform:translateY(-100%);visibility:visible}to{-webkit-transform:translateY(0);transform:translateY(0)}}@keyframes a{0%{-webkit-transform:translateY(-100%);transform:translateY(-100%);visibility:visible}to{-webkit-transform:translateY(0);transform:translateY(0)}}a{animation:a}',
);

test(
    'should remove declarations before rules',
    processCss,
    'h1{font-weight:700;font-weight:700}h1{font-weight:700}',
    'h1{font-weight:700}',
);

test(
    'should not remove declarations when selectors are different',
    processCss,
    'h1{font-weight:700}h2{font-weight:700}',
    'h1,h2{font-weight:700}',
);

test(
    'should not remove across contexts',
    processCss,
    'h1{display:block}@media print{h1{display:block}}',
    'h1{display:block}@media print{h1{display:block}}',
);
