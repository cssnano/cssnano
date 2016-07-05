module.exports.name = 'cssnano/postcss-discard-duplicates';
module.exports.tests = [{
    message: 'should remove duplicate rules',
    fixture: 'h1{font-weight:700}h1{font-weight:700}',
    expected: 'h1{font-weight:700}',
}, {
    message: 'should remove duplicate declarations',
    fixture: 'h1{font-weight:700;font-weight:700}',
    expected: 'h1{font-weight:700}',
}, {
    message: 'should remove duplicate @rules',
    fixture: '@charset "utf-8";@charset "utf-8";',
    expected: '@charset "utf-8";',
    options: {normalizeCharset: false},
}, {
    message: 'should remove duplicates inside @media queries',
    fixture: '@media print{h1{display:block}h1{display:block}}',
    expected: '@media print{h1{display:block}}',
}, {
    message: 'should remove duplicate @media queries',
    fixture: '@media print{h1{display:block}}@media print{h1{display:block}}',
    expected: '@media print{h1{display:block}}',
}, {
    message: 'should not mangle same keyframe rules but with different vendors',
    fixture: '@-webkit-keyframes flash{0%,50%,100%{opacity:1}25%,75%{opacity:0}}@keyframes flash{0%,50%,100%{opacity:1}25%,75%{opacity:0}}a{animation:flash}',
    expected: '@-webkit-keyframes a{0%,50%,to{opacity:1}25%,75%{opacity:0}}@keyframes a{0%,50%,to{opacity:1}25%,75%{opacity:0}}a{animation:a}',
}, {
    message: 'should not merge across keyframes',
    fixture: '@-webkit-keyframes test{0%{color:#000}to{color:#fff}}@keyframes test{0%{color:#000}to{color:#fff}}a{animation:test}',
    expected: '@-webkit-keyframes a{0%{color:#000}to{color:#fff}}@keyframes a{0%{color:#000}to{color:#fff}}a{animation:a}',
}, {
    message: 'should not merge across keyframes (2)',
    fixture: '@-webkit-keyframes slideInDown{0%{-webkit-transform:translateY(-100%);transform:translateY(-100%);visibility:visible}to{-webkit-transform:translateY(0);transform:translateY(0)}}@keyframes slideInDown{0%{-webkit-transform:translateY(-100%);transform:translateY(-100%);visibility:visible}to{-webkit-transform:translateY(0);transform:translateY(0)}}a{animation:slideInDown}',
    expected: '@-webkit-keyframes a{0%{-webkit-transform:translateY(-100%);transform:translateY(-100%);visibility:visible}to{-webkit-transform:translateY(0);transform:translateY(0)}}@keyframes a{0%{-webkit-transform:translateY(-100%);transform:translateY(-100%);visibility:visible}to{-webkit-transform:translateY(0);transform:translateY(0)}}a{animation:a}',
}, {
    message: 'should remove declarations before rules',
    fixture: 'h1{font-weight:700;font-weight:700}h1{font-weight:700}',
    expected: 'h1{font-weight:700}',
}, {
    message: 'should not remove declarations when selectors are different',
    fixture: 'h1{font-weight:700}h2{font-weight:700}',
    expected: 'h1,h2{font-weight:700}',
}, {
    message: 'should not remove across contexts',
    fixture: 'h1{display:block}@media print{h1{display:block}}',
    expected: 'h1{display:block}@media print{h1{display:block}}',
}];
