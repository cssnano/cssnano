'use strict';
const { test } = require('uvu');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');

const plugin = require('../src/index.js');

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

test(
  'should merge keyframe identifiers',
  processCSS(
    '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}',
    '@keyframes b{0%{color:#fff}to{color:#000}}'
  )
);

test(
  'should merge keyframe identifiers (2)',
  processCSS(
    '@keyframes a{0%{color:#fff}to{color:#000}}@KEYFRAMES b{0%{color:#fff}to{color:#000}}',
    '@KEYFRAMES b{0%{color:#fff}to{color:#000}}'
  )
);

test(
  'should merge multiple keyframe identifiers',
  processCSS(
    '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}@keyframes c{0%{color:#fff}to{color:#000}}',
    '@keyframes c{0%{color:#fff}to{color:#000}}'
  )
);

test(
  'should update relevant animation declarations',
  processCSS(
    '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}div{animation:a .2s ease}',
    '@keyframes b{0%{color:#fff}to{color:#000}}div{animation:b .2s ease}'
  )
);

test(
  'should update relevant animation declarations (2)',
  processCSS(
    '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}div{ANIMATION:a .2s ease}',
    '@keyframes b{0%{color:#fff}to{color:#000}}div{ANIMATION:b .2s ease}'
  )
);

test(
  'should update relevant animation declarations (3)',
  processCSS(
    '@keyframes a{0%{color:#fff}to{color:#000}}@keyframes b{0%{color:#fff}to{color:#000}}@keyframes c{0%{color:#fff}to{color:#000}}div{animation:a .2s ease}',
    '@keyframes c{0%{color:#fff}to{color:#000}}div{animation:c .2s ease}'
  )
);

test(
  'should not merge vendor prefixed keyframes',
  passthroughCSS(
    '@-webkit-keyframes a{0%{color:#fff}to{color:#000}}@keyframes a{0%{color:#fff}to{color:#000}}'
  )
);

test(
  'should merge duplicated keyframes with the same name',
  processCSS(
    '@keyframes a{0%{opacity:1}to{opacity:0}}@keyframes a{0%{opacity:1}to{opacity:0}}',
    '@keyframes a{0%{opacity:1}to{opacity:0}}'
  )
);

test(
  'should merge duplicated counter styles with the same name',
  processCSS(
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style a{system:extends decimal;suffix:"> "}',
    '@counter-style a{system:extends decimal;suffix:"> "}'
  )
);

test(
  'should merge duplicated counter styles with the same name (2)',
  processCSS(
    '@counter-style a{system:extends decimal;suffix:"> "}@COUNTER-STYLE a{system:extends decimal;suffix:"> "}',
    '@COUNTER-STYLE a{system:extends decimal;suffix:"> "}'
  )
);

test(
  'should merge counter style identifiers',
  processCSS(
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}',
    '@counter-style b{system:extends decimal;suffix:"> "}'
  )
);

test(
  'should merge multiple counter style identifiers',
  processCSS(
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}@counter-style c{system:extends decimal;suffix:"> "}',
    '@counter-style c{system:extends decimal;suffix:"> "}'
  )
);

test(
  'should update relevant list style declarations',
  processCSS(
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}ol{list-style:a}',
    '@counter-style b{system:extends decimal;suffix:"> "}ol{list-style:b}'
  )
);

test(
  'should update relevant list style declarations (2)',
  processCSS(
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}@counter-style c{system:extends decimal;suffix:"> "}ol{list-style:a}',
    '@counter-style c{system:extends decimal;suffix:"> "}ol{list-style:c}'
  )
);

test(
  'should update relevant list style declarations (3)',
  processCSS(
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends decimal;suffix:"> "}ol{LIST-STYLE:a}',
    '@counter-style b{system:extends decimal;suffix:"> "}ol{LIST-STYLE:b}'
  )
);

test(
  'should update relevant system declarations',
  processCSS(
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends a;suffix:"> "}@counter-style c{system:extends a;suffix:"> "}ol{list-style:c}',
    '@counter-style a{system:extends decimal;suffix:"> "}@counter-style c{system:extends a;suffix:"> "}ol{list-style:c}'
  )
);

test(
  'should not output JS functions',
  passthroughCSS(
    '.ui.indeterminate.loader:after{-webkit-animation-direction:reverse;animation-direction:reverse;-webkit-animation-duration:1.2s;animation-duration:1.2s}'
  )
);

test(
  'should handle duplicated definitions',
  processCSS(
    [
      '.checkbox input[type=checkbox]:checked + .checkbox-material:before{-webkit-animation:rippleOn 500ms;-o-animation:rippleOn 500ms;animation:rippleOn 500ms}',
      '.checkbox input[type=checkbox]:checked + .checkbox-material .check:after{-webkit-animation:rippleOn 500ms forwards;-o-animation:rippleOn 500ms forwards;animation:rippleOn 500ms forwards}',
      '@-webkit-keyframes rippleOn{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
      '@-o-keyframes rippleOn{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
      '@keyframes rippleOn{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
      '@-webkit-keyframes rippleOff{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
      '@-o-keyframes rippleOff{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
      '@keyframes rippleOff{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
      '@keyframes rippleOn{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
      '@keyframes rippleOff{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
    ].join(''),
    [
      '.checkbox input[type=checkbox]:checked + .checkbox-material:before{-webkit-animation:rippleOff 500ms;-o-animation:rippleOff 500ms;animation:rippleOff 500ms}',
      '.checkbox input[type=checkbox]:checked + .checkbox-material .check:after{-webkit-animation:rippleOff 500ms forwards;-o-animation:rippleOff 500ms forwards;animation:rippleOff 500ms forwards}',
      '@-webkit-keyframes rippleOff{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
      '@-o-keyframes rippleOff{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
      '@keyframes rippleOff{0%{opacity:0}50%{opacity:0.2}100%{opacity:0}}',
    ].join('')
  )
);

test(
  'should handle duplication within media queries',
  passthroughCSS(
    [
      '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
      '@media (max-width:400px){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
      '.spin{animation:1s spin infinite linear}',
    ].join('')
  )
);

test(
  'should handle duplication within supports rules',
  passthroughCSS(
    [
      '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
      '@supports (transform:rotate(0deg)){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
      '.spin{animation:1s spin infinite linear}',
    ].join('')
  )
);

test(
  'should handle duplication within supports rules & media queries',
  passthroughCSS(
    [
      '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
      '@media (max-width:400px){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
      '@supports (transform:rotate(0deg)){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
      '.spin{animation:1s spin infinite linear}',
    ].join('')
  )
);

test(
  'should handle duplication within nested at-rules',
  passthroughCSS(
    [
      '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}',
      '@media (max-width:400px){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
      '@supports (transform:rotate(0deg)){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}',
      '@media (max-width: 400px){@supports (transform:rotate(0deg)){@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}}}',
      '.spin{animation:1s spin infinite linear}',
    ].join('')
  )
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));

test(
  'should not crash on potential circular references',
  processCSS(
    `.hi{animation:hi 2s infinite linear}@-webkit-keyframes hi{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}.ho{animation:ho 2s infinite linear}@-webkit-keyframes ho{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}@keyframes ho{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}@keyframes hi{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}`,
    `.hi{animation:hi 2s infinite linear}.ho{animation:ho 2s infinite linear}@-webkit-keyframes ho{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}@keyframes hi{0%{transform:rotate(0deg)}to{transform:rotate(359deg)}}`
  )
);
test.run();
