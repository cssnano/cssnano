import { test, suite } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

const modernBl = { overrideBrowserslist: 'last 2 Chrome versions' };

suite('top-level folding with functional pseudos', () => {
  test(
    'folds entries after normalizing comma-containing selector functions',
    processCSS(
      '.scope:is(.a,.b) .x,.scope:is(.a,.b) .y,' +
        '.scope:is(.a,.b) .z{color:red}',
      '.scope:is(.a,.b) :is(.x,.y,.z){color:red}',
      modernBl
    )
  );

  test(
    'preserves nested :not(), :where(), and :has() while folding',
    processCSS(
      ':not(:is(.a,.b),:where(.c,.d)) .x,' +
        ':not(:is(.a,.b),:where(.c,.d)) .y,' +
        ':not(:is(.a,.b),:where(.c,.d)) .z{color:red}',
      ':not(:is(.a,.b),:where(.c,.d)) :is(.x,.y,.z){color:red}',
      modernBl
    )
  );

  test(
    'preserves source order when sorting is disabled',
    processCSS(
      '.scope:has(.a,.b) .z,.scope:has(.a,.b) .a,' +
        '.scope:has(.a,.b) .m{color:red}',
      '.scope:has(.a,.b) :is(.z,.a,.m){color:red}',
      { ...modernBl, sort: false }
    )
  );

  test(
    'dedupes top-level entries without deduping vendor pseudo-elements',
    processCSS(
      '.scope:is(.a,.b) .x,.scope:is(.a,.b) .x,' +
        '.scope:is(.a,.b) .y, .scope::-webkit-input-placeholder,' +
        '.scope::-webkit-input-placeholder{color:red}',
      '.scope::-webkit-input-placeholder,.scope::-webkit-input-placeholder,' +
        '.scope:is(.a,.b) :is(.x,.y){color:red}',
      modernBl
    )
  );

  test('is idempotent for folds containing nested functions', async () => {
    const input =
      '.scope:not(:is(.a,.b),:where(.c,.d)) .x,' +
      '.scope:not(:is(.a,.b),:where(.c,.d)) .y{color:red}';
    await processCSS(
      input,
      '.scope:not(:is(.a,.b),:where(.c,.d)) :is(.x,.y){color:red}',
      modernBl
    )();
  });

  test('rejects unsafe and mixed-specificity fold candidates', () => {
    const cases = [
      '.scope .a,.scope #id{color:red}',
      '.scope svg|a,.scope svg|b,.scope svg|c{color:red}',
      '.scope .a:hover,.scope .c:nth-child(2n){color:red}',
    ];
    for (const input of cases) {
      const output = [
        '.scope #id,.scope .a{color:red}',
        '.scope svg|a,.scope svg|b,.scope svg|c{color:red}',
        '.scope .a:hover,.scope .c:nth-child(2n){color:red}',
      ][cases.indexOf(input)];
      assert.equal(
        postcss([plugin({ ...modernBl })]).process(input, { from: undefined })
          .css,
        output,
        input
      );
    }
  });

  test('folds valid subsets while excluding mixed-specificity or unsafe candidates', () => {
    const cases = [
      {
        input: '.scope .a,.scope #id,.scope .b{color:red}',
        expected: '.scope #id,.scope :is(.a,.b){color:red}',
      },
      {
        input:
          '.scope .a:hover,.scope .b:focus,.scope .c:nth-child(2n){color:red}',
        expected:
          '.scope .c:nth-child(2n),.scope :is(.a:hover,.b:focus){color:red}',
      },
    ];
    for (const { input, expected } of cases) {
      assert.equal(
        postcss([plugin({ ...modernBl })]).process(input, { from: undefined })
          .css,
        expected,
        input
      );
    }
  });

  test('normalizes a large function-containing selector list in one pass', () => {
    const selectors = Array.from(
      { length: 1000 },
      (_, index) => `.scope:is(.a${index % 10},.b${index % 10}) .item${index}`
    ).join(',');
    const output = postcss([plugin({ ...modernBl })]).process(
      `${selectors}{color:red}`,
      { from: undefined }
    ).css;
    assert.match(output, /^\.scope:is\(\.a0,\.b0\) /v);
    assert.match(output, /\.item999\)\{color:red\}$/v);
  });

  test(
    'should retain rule and sibling selectors when forgiving selector list becomes empty',
    processCSS('.a, :is([attr~]){color:blue}', '.a,:is(){color:blue}')
  );

  test(
    'should retain rule when :where() forgiving selector list becomes empty',
    processCSS(':where([attr~]), .b{color:blue}', '.b,:where(){color:blue}')
  );

  test(
    'should retain rule when single forgiving selector list becomes empty',
    processCSS(':is([attr~]){color:blue}', ':is(){color:blue}')
  );
});

suite('CSS specification alignment and conformance', () => {
  test(
    'should allow attribute modifier without whitespace after string value',
    processCSS(
      ':is([attr="val"i]){color:blue}',
      ':is([attr=val i]){color:blue}'
    )
  );

  test(
    'should not fold keyframe selectors to :is()',
    processCSS(
      '@keyframes foo{0%,50%{opacity:0}to{opacity:1}}',
      '@keyframes foo{0%,50%{opacity:0}to{opacity:1}}',
      modernBl
    )
  );

  test(
    'should preserve keyframe-only percentages in a style selector list',
    passthroughCSS('from,to,50%,100%{color:blue}')
  );

  test(
    'should preserve trailing important comments when folding selectors',
    processCSS(
      'section h1 /*! keep */, article h1, aside h1, nav h1{font-size:25px}',
      ':is(article,aside,nav,section) h1 /*! keep */{font-size:25px}',
      modernBl
    )
  );

  test(
    'should preserve leading important comments when folding selectors',
    processCSS(
      '.a .tail,/*! keep */.b .tail,.c .tail{color:blue}',
      ':is(.a,/*! keep */.b,.c) .tail{color:blue}',
      modernBl
    )
  );

  test(
    'should reject whitespace inside view-transition pseudo-element argument',
    passthroughCSS('::view-transition-group(foo .bar){animation:none}')
  );

  test(
    'should mark compound selector invalid when subclass follows pseudo-element',
    passthroughCSS('::before.foo{color:blue}')
  );

  test(
    'should mark compound selector invalid when id follows pseudo-element',
    passthroughCSS('::before#bar{color:blue}')
  );

  test(
    'should mark compound selector invalid when attribute follows pseudo-element',
    passthroughCSS('::before[baz]{color:blue}')
  );

  test(
    'should convert :nth-child(+1) to :first-child',
    processCSS('p:nth-child(+1){color:blue}', 'p:first-child{color:blue}')
  );

  test(
    'should convert :nth-last-child(+1) to :last-child',
    processCSS('p:nth-last-child(+1){color:blue}', 'p:last-child{color:blue}')
  );

  test(
    'should convert :nth-of-type(+1) to :first-of-type',
    processCSS('p:nth-of-type(+1){color:blue}', 'p:first-of-type{color:blue}')
  );
});
