module.exports.name = 'css-nano/postcss-merge-idents';
module.exports.tests = [{
    message: 'should merge keyframe identifiers',
    fixture: '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}',
    expected: '@keyframes b{0%{color:#fff}to{color:#000}}',
}, {
    message: 'should merge multiple keyframe identifiers',
    fixture: '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}@keyframes c{0%{color:#fff}to{color:#000}}',
    expected: '@keyframes c{0%{color:#fff}to{color:#000}}',
}, {
    message: 'should update relevant animation declarations',
    fixture: '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}div{animation:a .2s ease}',
    expected: '@keyframes a{0%{color:#fff}to{color:#000}}div{animation:a .2s ease}'
}, {
    message: 'should update relevant animation declarations (2)',
    fixture: '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}@keyframes c{0%{color:#fff}to{color:#000}}div{animation:a .2s ease}',
    expected: '@keyframes a{0%{color:#fff}to{color:#000}}div{animation:a .2s ease}'
}, {
    message: 'should not merge vendor prefixed keyframes',
    fixture: '@-webkit-keyframes a{0%{color:#fff}to{color:#000}}@keyframes a{0%{color:#fff}to{color:#000}}',
    expected: '@-webkit-keyframes a{0%{color:#fff}to{color:#000}}@keyframes a{0%{color:#fff}to{color:#000}}'
}, {
    message: 'should merge counter style identifiers',
    fixture: '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}',
    expected: '@counter-style b{system:extends decimal;suffix:"> "}',
}, {
    message: 'should merge multiple counter style identifiers',
    fixture: '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}@counter-style c{system:extends decimal;suffix:"> "}',
    expected: '@counter-style c{system:extends decimal;suffix:"> "}',
}, {
    message: 'should update relevant list style declarations',
    fixture: '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}ol{list-style:a}',
    expected: '@counter-style a{system:extends decimal;suffix:"> "}ol{list-style:a}'
}, {
    message: 'should update relevant list style declarations (2)',
    fixture: '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}@counter-style c{system:extends decimal;suffix:"> "}ol{list-style:a}',
    expected: '@counter-style a{system:extends decimal;suffix:"> "}ol{list-style:a}'
}, {
    message: 'should update relevant system declarations',
    fixture: '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends a;suffix:"> "}@counter-style c{system:extends a;suffix:"> "}ol{list-style:c}',
    expected: '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends a;suffix:"> "}ol{list-style:b}'
}];
