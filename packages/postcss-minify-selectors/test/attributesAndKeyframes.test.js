import { test, suite } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

suite('attribute selector normalization', () => {
  test(
    'should preserve a modifier without an attribute value',
    passthroughCSS('a[foo i]{color:blue}')
  );

  test(
    'should preserve an attribute matcher with no value',
    passthroughCSS('a[foo=]{color:blue}')
  );

  test(
    'should treat i and s as identifier attribute values',
    processCSS(
      'a[foo= i],a[foo= s]{color:blue}',
      'a[foo=i],a[foo=s]{color:blue}'
    )
  );

  test(
    'should preserve dash matchers in forgiving selector lists',
    processCSS(
      ':is([lang|=en],.ok){color:blue}',
      ':is([lang|=en],.ok){color:blue}',
      { sort: false }
    )
  );

  test(
    'should recognise escaped attribute modifiers',
    processCSS(
      ':is([foo=bar \\69],.ok){color:blue}',
      ':is([foo=bar \\69],.ok){color:blue}',
      { sort: false }
    )
  );

  test(
    'should preserve malformed attribute selector boundaries',
    passthroughCSS(
      'a[foo=bar baz],a[foo=bar i s],a[foo~ =bar],a[foo| =bar],a[ns | name=bar]{color:blue}'
    )
  );

  test(
    'should discard malformed attributes from forgiving selector lists',
    processCSS(
      ':is([foo i],.ok),:where([foo=],.also-ok){color:blue}',
      ':is(.ok),:where(.also-ok){color:blue}'
    )
  );

  test(
    'should preserve malformed attributes in strict selector lists',
    passthroughCSS(':not([foo i],.ok){color:blue}')
  );

  test(
    'should normalise attribute selectors',
    processCSS(
      'a[   color=   "blue"    ]{color:blue}',
      'a[color=blue]{color:blue}'
    )
  );

  test(
    'should normalise attribute selectors (2)',
    passthroughCSS('a[class^="options["]:after{color:blue}')
  );

  test(
    'should normalise attribute selectors (3)',
    processCSS(
      'a[class="woop_woop_woop"]{color:blue}',
      'a[class=woop_woop_woop]{color:blue}'
    )
  );

  test(
    'should normalise attribute selectors (4)',
    processCSS(
      'a[class="woop \\\nwoop woop"]{color:blue}',
      'a[class="woop woop woop"]{color:blue}'
    )
  );

  test(
    'should normalise attribute selectors (5)',
    processCSS(
      'a[   color   =   "blue"    ]{color:blue}',
      'a[color=blue]{color:blue}'
    )
  );

  test(
    'should normalise attribute selectors (6)',
    processCSS(
      'a[color="blue"   i   ]{color:blue}',
      'a[color=blue i]{color:blue}'
    )
  );

  test(
    'should normalise attribute selectors (7)',
    processCSS('a[   target   ]{color:blue}', 'a[target]{color:blue}')
  );

  test(
    'should drop malformed attribute operator in forgiving selector list',
    processCSS(':is([attr~], .ok){color:blue}', ':is(.ok){color:blue}')
  );

  test(
    'should drop malformed prefix attribute operator in forgiving selector list',
    processCSS(':is([attr^], .ok){color:blue}', ':is(.ok){color:blue}')
  );
});

suite('@keyframe normalization', () => {
  test(
    'should convert @keyframe from & 100%',
    processCSS(
      '@keyframes test{from{color:red}100%{color:blue}}',
      '@keyframes test{0%{color:red}to{color:blue}}'
    )
  );

  test(
    'should convert @keyframe from & 100% (2)',
    processCSS(
      '@keyframes test{FROM{color:red}100%{color:blue}}',
      '@keyframes test{0%{color:red}to{color:blue}}'
    )
  );

  test(
    'should convert recognized vendor-prefixed keyframes',
    processCSS(
      '@-WEBKIT-KEYFRAMES test{FROM{color:red}}',
      '@-WEBKIT-KEYFRAMES test{0%{color:red}}'
    )
  );

  test(
    'should convert 100% to to in vendor-prefixed keyframes',
    processCSS(
      '@-webkit-keyframes test{100%{color:red}}',
      '@-webkit-keyframes test{to{color:red}}'
    )
  );

  test(
    'should not fold stops into :is() under vendor-prefixed keyframes',
    processCSS(
      '@-webkit-keyframes test{0%,100%{color:red}}',
      '@-webkit-keyframes test{0%,to{color:red}}'
    )
  );

  test(
    'should convert mixed-case vendor-prefixed keyframes',
    processCSS(
      '@-Webkit-Keyframes test{from{color:red}}',
      '@-Webkit-Keyframes test{0%{color:red}}'
    )
  );

  test(
    'should convert @-moz-keyframes from',
    processCSS(
      '@-moz-keyframes test{from{color:red}}',
      '@-moz-keyframes test{0%{color:red}}'
    )
  );

  test(
    'should convert @-o-keyframes from',
    processCSS(
      '@-o-keyframes test{from{color:red}}',
      '@-o-keyframes test{0%{color:red}}'
    )
  );

  test(
    'should convert uppercase unprefixed keyframes',
    processCSS(
      '@KEYFRAMES test{from{color:red}}',
      '@KEYFRAMES test{0%{color:red}}'
    )
  );

  test(
    'should not mangle @keyframe from & 100% in other values',
    passthroughCSS('@keyframes test{x-from-tag{color:red}5100%{color:blue}}')
  );

  test(
    'should not mangle @keyframe 100% in named timeline range names and percentages',
    passthroughCSS('@keyframes test{entry 100%{color:red}}')
  );

  test(
    'should not treat suffixed at-rules as keyframes',
    passthroughCSS('@foo-keyframes x{from{color:red}}')
  );

  test(
    'should not treat prefixed at-rules as keyframes',
    passthroughCSS('@not-webkit-keyframes x{from{color:red}}')
  );

  test(
    'should use ASCII case-insensitive keyframe matching',
    passthroughCSS('@Keyframes x{from{color:red}}')
  );

  test(
    'should not treat length-matching at-rules as keyframes',
    passthroughCSS('@container (min-width:0px){from{color:red}}')
  );
});

const modernBl = { overrideBrowserslist: 'last 2 Chrome versions' };

suite('sorting ownership and keyframe ordering', () => {
  test(
    'sorting with folding disabled',
    processCSS('.c, .a, .b{color:blue}', '.a,.b,.c{color:blue}', {
      convertToIs: false,
    })
  );

  test(
    'sorting when folding makes no change',
    processCSS('.c, .a, .b{color:blue}', '.a,.b,.c{color:blue}', {
      convertToIs: true,
    })
  );

  test(
    'sorting after folding changes list membership',
    processCSS(
      'z-last, section h1, article h1, aside h1, nav h1{color:blue}',
      ':is(article,aside,nav,section) h1,z-last{color:blue}',
      modernBl
    )
  );

  test(
    'preserves order when sort is false with folding disabled',
    processCSS('.c, .a, .b{color:blue}', '.c,.a,.b{color:blue}', {
      sort: false,
      convertToIs: false,
    })
  );

  test(
    'preserves order when sort is false with folding enabled',
    processCSS(
      'z-first, section h1, article h1, aside h1, nav h1{color:blue}',
      'z-first,:is(section,article,aside,nav) h1{color:blue}',
      { ...modernBl, sort: false }
    )
  );

  test(
    'ordinary keyframes ordering and stop normalization',
    processCSS(
      '@keyframes test{100%, from, 50%{color:red}}',
      '@keyframes test{to,50%,0%{color:red}}'
    )
  );

  test(
    'vendor-prefixed keyframes ordering and stop normalization',
    processCSS(
      '@-webkit-keyframes test{100%, from, 50%{color:red}}',
      '@-webkit-keyframes test{to,50%,0%{color:red}}'
    )
  );

  test(
    'moz vendor-prefixed keyframes ordering and stop normalization',
    processCSS(
      '@-moz-keyframes test{100%, from, 50%{color:red}}',
      '@-moz-keyframes test{to,50%,0%{color:red}}'
    )
  );

  test(
    'keyframes preserves original order when sort is false',
    processCSS(
      '@keyframes test{100%, from{color:red}}',
      '@keyframes test{to,0%{color:red}}',
      { sort: false }
    )
  );
});
