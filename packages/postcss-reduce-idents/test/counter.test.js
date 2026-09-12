import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Counter', () => {
  test(
    'should rename counters',
    processCSS(
      'body{counter-reset:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
      'body{counter-reset:a}h3:before{counter-increment:a;content:"Section" counter(a) ": "}'
    )
  );

  test(
    'should rename counters (uppercase)',
    processCSS(
      'body{COUNTER-RESET:section}h3:before{COUNTER-INCREMENT:section;CONTENT:"Section" counter(section) ": "}',
      'body{COUNTER-RESET:a}h3:before{COUNTER-INCREMENT:a;CONTENT:"Section" counter(a) ": "}'
    )
  );

  test(
    'should rename counters (2)',
    processCSS(
      'h3:before{content:counter(section, section2);counter-increment:section}',
      'h3:before{content:counter(a, section2);counter-increment:a}'
    )
  );

  test(
    'should not rename a counter style argument as a counter',
    passthroughCSS(
      'body{counter-reset:custom-style}h3:before{content:counter(foo,custom-style)}'
    )
  );

  test(
    'should rename counters (3)',
    processCSS(
      'li{counter-increment:item}li::marker{content:"(" counters(item,".") ")"}',
      'li{counter-increment:a}li::marker{content:"(" counters(a,".") ")"}'
    )
  );

  test(
    'should rename counters (3) (uppercase)',
    processCSS(
      'li{counter-increment:item}li::marker{content:"(" COUNTERS(item,".") ")"}',
      'li{counter-increment:a}li::marker{content:"(" COUNTERS(a,".") ")"}'
    )
  );

  test(
    'should rename multiple counters',
    processCSS(
      'h1:before{counter-reset:chapter 1 section pagenum 1;content: counter(chapter) \t "."  counter(section) " (pg." counter(pagenum) ") "}',
      'h1:before{counter-reset:a 1 b c 1;content: counter(a) "." counter(b) " (pg." counter(c) ") "}'
    )
  );

  test(
    'should rename multiple counters with random order',
    processCSS(
      'h1:before{content: counter(chapter) "." counter(section) " (pg." counter(pagenum) ") ";counter-reset:chapter 1 section  pagenum 1}',
      'h1:before{content: counter(a) "." counter(b) " (pg." counter(c) ") ";counter-reset:a 1 b  c 1}'
    )
  );

  test(
    'should not rename the counters the user agent maintains',
    passthroughCSS(
      '@page{counter-reset:page 1}ol{counter-reset:list-item 3}li:before{content:counter(list-item) "/" counter(page)}'
    )
  );

  test(
    'should rename a counter referenced from string-set',
    processCSS(
      'h1{counter-reset:chapter;string-set:title counter(chapter)}p:before{content:counter(chapter)}',
      'h1{counter-reset:a;string-set:title counter(a)}p:before{content:counter(a)}'
    )
  );

  test(
    'should rename counters defined with counter-set',
    processCSS(
      'body{counter-set:section}h3:before{counter-increment:section;content:"Section" counter(section) ": "}',
      'body{counter-set:a}h3:before{counter-increment:a;content:"Section" counter(a) ": "}'
    )
  );

  test(
    'should rename counters with counter-set and counter-reset together',
    processCSS(
      'body{counter-reset:section;counter-set:subsection}h3:before{counter-increment:subsection;content:counter(section) "." counter(subsection)}',
      'body{counter-reset:a;counter-set:b}h3:before{counter-increment:b;content:counter(a) "." counter(b)}'
    )
  );

  test(
    'should rename a counter referenced in bookmark-label',
    processCSS(
      'h1{counter-reset:chapter;bookmark-label:counter(chapter)}',
      'h1{counter-reset:a;bookmark-label:counter(a)}'
    )
  );

  test(
    'should rename a counter referenced in target-counters',
    processCSS(
      'body{counter-reset:toc}a:after{content:target-counters(attr(href),toc,".")}',
      'body{counter-reset:a}a:after{content:target-counters(attr(href),a,".")}'
    )
  );

  test(
    'should rename a counter referenced by target-counter',
    processCSS(
      'body{counter-reset:section}h3:before{content:counter(section)}a:after{content:target-counter(attr(href),section)}',
      'body{counter-reset:a}h3:before{content:counter(a)}a:after{content:target-counter(attr(href),a)}'
    )
  );

  test(
    'should only rename defined counters that are referenced and preserve unreferenced ones in counter-reset',
    processCSS(
      'body{counter-reset:active 1 inactive 2}h1:before{content:counter(active)}',
      'body{counter-reset:a 1 inactive 2}h1:before{content:counter(a)}'
    )
  );

  test(
    'should only rename defined counters that are referenced and preserve unreferenced ones in counter-increment',
    processCSS(
      'body{counter-increment:active 1 inactive 2}h1:before{content:counter(active)}',
      'body{counter-increment:a 1 inactive 2}h1:before{content:counter(a)}'
    )
  );

  test(
    'should only rename defined counters that are referenced and preserve unreferenced ones in counter-set',
    processCSS(
      'body{counter-set:active 1 inactive 2}h1:before{content:counter(active)}',
      'body{counter-set:a 1 inactive 2}h1:before{content:counter(a)}'
    )
  );

  test(
    'should rename counter and counter-style in multi-argument target-counter',
    processCSS(
      '@counter-style roman{system:additive;additive-symbols:10 X,5 V,1 I}body{counter-reset:ch}a:after{content:target-counter(attr(href),ch,roman)}',
      '@counter-style a{system:additive;additive-symbols:10 X,5 V,1 I}body{counter-reset:a}a:after{content:target-counter(attr(href),a,a)}'
    )
  );

  test(
    'should rename counter and counter-style in multi-argument target-counters',
    processCSS(
      '@counter-style roman{system:additive;additive-symbols:10 X,5 V,1 I}body{counter-reset:toc}a:after{content:target-counters(attr(href),toc,".",roman)}',
      '@counter-style a{system:additive;additive-symbols:10 X,5 V,1 I}body{counter-reset:a}a:after{content:target-counters(attr(href),a,".",a)}'
    )
  );

  test(
    'should not touch counters that are not outputted',
    passthroughCSS('h1{counter-reset:chapter 1 section page 1}')
  );

  test(
    'should not touch counter functions which are not defined',
    passthroughCSS('h1:before{content:counter(chapter) ". "}')
  );

  test(
    'should pass through content declarations without counter functions when no counters are defined',
    passthroughCSS(
      'div:before{content:"foo"}span:before{content:"\\f101"}p:before{content:attr(data-label)}'
    )
  );

  test(
    'should not rename counter functions when only unreferenced definitions are present in the document',
    passthroughCSS(
      'h1{counter-reset:other 1}h2:before{content:counter(unknown) ". "}'
    )
  );

  test('should not generate colliding counter idents when plugin instance is reused', async () => {
    const instance = postcss(plugin);

    const [result1, result2] = await Promise.all([
      instance.process('body{counter-reset:cnt1}div{content:counter(cnt1)}', {
        from: undefined,
      }),
      instance.process('body{counter-reset:cnt2}div{content:counter(cnt2)}', {
        from: undefined,
      }),
    ]);

    assert.strictEqual(
      result1.css,
      'body{counter-reset:a}div{content:counter(a)}'
    );
    assert.strictEqual(
      result2.css,
      'body{counter-reset:b}div{content:counter(b)}'
    );
  });
});
