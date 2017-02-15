import test from 'ava';
import processCss from './_processCss';

test(
    'should merge keyframe identifiers',
    processCss,
    '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}a{animation:b}',
    '@keyframes a{0%{color:#fff}to{color:#000}}a{animation:a}',
);

test(
    'should merge multiple keyframe identifiers',
    processCss,
    '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}@keyframes c{0%{color:#fff}to{color:#000}}a{animation:c}',
    '@keyframes a{0%{color:#fff}to{color:#000}}a{animation:a}',
);

test(
    'should update relevant animation declarations',
    processCss,
    '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}div{animation:a .2s ease}',
    '@keyframes a{0%{color:#fff}to{color:#000}}div{animation:a .2s ease}',
);

test(
    'should update relevant animation declarations (2)',
    processCss,
    '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}@keyframes c{0%{color:#fff}to{color:#000}}div{animation:a .2s ease}',
    '@keyframes a{0%{color:#fff}to{color:#000}}div{animation:a .2s ease}',
);

test(
    'should not merge vendor prefixed keyframes',
    processCss,
    '@-webkit-keyframes a{0%{color:#fff}to{color:#000}}@keyframes a{0%{color:#fff}to{color:#000}}a{animation:a}',
    '@-webkit-keyframes a{0%{color:#fff}to{color:#000}}@keyframes a{0%{color:#fff}to{color:#000}}a{animation:a}',
);

test(
    'should merge counter style identifiers',
    processCss,
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}a{list-style:b}',
    '@counter-style a{system:extends decimal;suffix:"> "}a{list-style:a}',
);

test(
    'should merge multiple counter style identifiers',
    processCss,
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}@counter-style c{system:extends decimal;suffix:"> "}a{list-style:c}',
    '@counter-style a{system:extends decimal;suffix:"> "}a{list-style:a}',
);

test(
    'should update relevant list style declarations',
    processCss,
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}ol{list-style:a}',
    '@counter-style a{system:extends decimal;suffix:"> "}ol{list-style:a}',
);

test(
    'should update relevant list style declarations (2)',
    processCss,
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}@counter-style c{system:extends decimal;suffix:"> "}ol{list-style:a}',
    '@counter-style a{system:extends decimal;suffix:"> "}ol{list-style:a}',
);

test(
    'should update relevant system declarations',
    processCss,
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends a;suffix:"> "}@counter-style c{system:extends a;suffix:"> "}ol{list-style:c}',
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends a;suffix:"> "}ol{list-style:b}',
);
