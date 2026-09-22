import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should merge vendor prefixed selectors when vendors are the same',
  processCSS(
    'code ::-moz-selection{background:red}code::-moz-selection{background:red}',
    'code ::-moz-selection,code::-moz-selection{background:red}'
  )
);

test(
  'should not merge mixed vendor prefixes',
  passthroughCSS(
    'code ::-webkit-selection{background:red}code::-moz-selection{background:red}'
  )
);

test(
  'should not merge ms vendor prefixes',
  passthroughCSS(
    'code :-ms-input-placeholder{background:red}code::-ms-input-placeholder{background:red}'
  )
);

test(
  'should chain-merge three rules with the same vendor prefix into a single rule',
  processCSS(
    'a::-moz-selection{color:red}b::-moz-selection{color:red}c::-moz-selection{color:red}',
    'a::-moz-selection,b::-moz-selection,c::-moz-selection{color:red}'
  )
);

test(
  'should not merge mixed vendor prefixes (2)',
  passthroughCSS(
    'input[type=range] { -webkit-appearance: none !important; } input[type=range]::-webkit-slider-runnable-track { height: 2px; width: 100px; background: red; border: none; } input[type=range]::-webkit-slider-thumb { -webkit-appearance: none !important; border: none; width: 10px; height: 10px; background: red; } input[type=range]::-moz-range-thumb { border: none; width: 10px; height: 10px; background: red; }'
  )
);

test(
  'should not merge mixed vendor prefixed and non-vendor prefixed',
  passthroughCSS(
    'code ::selection{background:red}code ::-moz-selection{background:red}'
  )
);

test(
  'should merge properties with vendor prefixes',
  processCSS(
    '.a{-webkit-transform: translateX(-50%) translateY(-50%) rotate(-90deg);-webkit-overflow-scrolling: touch}.b{-webkit-transform: translateX(-50%) translateY(-50%) rotate(-90deg);}',
    '.a{-webkit-overflow-scrolling: touch}.a,.b{-webkit-transform: translateX(-50%) translateY(-50%) rotate(-90deg);}'
  )
);

test(
  'should not merge overlapping rules with vendor prefixes',
  passthroughCSS(
    '.foo{background:#fff;-webkit-background-clip:text}.bar{background:#000;-webkit-background-clip:text}'
  )
);

test(
  'should not merge properties with "all"',
  passthroughCSS(
    '.a{color:red;display:flex;font-size:10px;}.c{all:unset;color:red;display:flex;font-size:10px;}'
  )
);

test(
  'should not merge properties with "all" (2)',
  passthroughCSS('.foo{color:red}.bar{all:unset;color:red}')
);

test(
  'should merge "direction" property with "all"',
  processCSS(
    '.a{color:red;display:flex;font-size:10px;direction:tlr;}.c{all:unset;color:red;display:flex;font-size:10px;direction:tlr;}',
    '.a{color:red;display:flex;font-size:10px;}.a,.c{direction:tlr;}.c{all:unset;color:red;display:flex;font-size:10px;}'
  )
);

test(
  'should merge "unicode-bidi" property with "all"',
  processCSS(
    '.a{color:red;display:flex;font-size:10px;unicode-bidi:normal;}.c{all:unset;color:red;display:flex;font-size:10px;unicode-bidi:normal;}',
    '.a{color:red;display:flex;font-size:10px;}.a,.c{unicode-bidi:normal;}.c{all:unset;color:red;display:flex;font-size:10px;}'
  )
);

test(
  'should not merge :focus-visible',
  processCSS(
    'a{color : green;} a:focus-visible{ color : green;} a:focus-visible{ background : red}',
    'a{color : green;} a:focus-visible{ color : green;} a:focus-visible{ background : red}'
  )
);

test(
  'should merge :visited and :link pseudo-classes',
  processCSS(
    'a,a:link{color:#555}a:visited{color:#555}',
    'a,a:link,a:visited{color:#555}'
  )
);

test(
  'should merge :modal selectors when every target browser supports the dialog element',
  processCSS(
    'dialog:modal{color:red}aside:modal{color:red}',
    'dialog:modal,aside:modal{color:red}',
    { overrideBrowserslist: ['chrome 120', 'firefox 120', 'safari 16'] }
  )
);

test(
  'should not merge :modal selectors when a target browser predates the dialog element',
  passthroughCSS('dialog:modal{color:red}aside:modal{color:red}', {
    overrideBrowserslist: ['chrome 120', 'firefox 97', 'safari 15'],
  })
);

test(
  'should merge ::file-selector-button selectors when every target browser supports them',
  processCSS(
    'input::file-selector-button{color:red}form input::file-selector-button{color:red}',
    'input::file-selector-button,form input::file-selector-button{color:red}',
    { overrideBrowserslist: ['chrome 120', 'firefox 120', 'safari 16'] }
  )
);

test(
  'should merge :read-only and :read-write selectors when every target browser supports them',
  processCSS(
    'input:read-only{color:red}input:read-write{color:red}',
    'input:read-only,input:read-write{color:red}',
    { overrideBrowserslist: ['chrome 120', 'firefox 120', 'safari 16'] }
  )
);

test(
  'should merge :autofill selectors when every target browser supports them unprefixed',
  processCSS(
    'input:autofill{color:red}textarea:autofill{color:red}',
    'input:autofill,textarea:autofill{color:red}',
    { overrideBrowserslist: ['chrome 122', 'edge 122', 'safari 17'] }
  )
);

test(
  'should merge :fullscreen selectors when every target browser supports them unprefixed',
  processCSS(
    'section:fullscreen{color:red}article:fullscreen{color:red}',
    'section:fullscreen,article:fullscreen{color:red}',
    { overrideBrowserslist: ['chrome 120', 'firefox 120', 'safari 16.4'] }
  )
);

test(
  'should not merge :popover-open because it has no verified caniuse feature',
  passthroughCSS('a:popover-open{color:red}b:popover-open{color:red}', {
    overrideBrowserslist: ['chrome 140', 'firefox 140', 'safari 18.4'],
  })
);

test(
  'should not merge :user-invalid because it has no verified caniuse feature',
  passthroughCSS('a:user-invalid{color:red}b:user-invalid{color:red}', {
    overrideBrowserslist: ['chrome 140', 'firefox 140', 'safari 18.4'],
  })
);

test(
  'should not merge colors',
  processCSS(
    'h1{color:#001;color:#002;color:#003}h2{color:#001;color:#002}',
    'h1{color:#001;color:#002;color:#003}h2{color:#001;color:#002}'
  )
);
