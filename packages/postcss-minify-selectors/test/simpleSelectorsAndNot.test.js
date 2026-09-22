import { test, suite } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

suite('trimming spaces', () => {
  test(
    'should trim spaces in simple selectors',
    processCSS('h1,  h2,  h3{color:blue}', 'h1,h2,h3{color:blue}')
  );

  test(
    'should trim spaces around combinators',
    processCSS(
      'h1 + p, h1 > p, h1 ~ p{color:blue}',
      'h1+p,h1>p,h1~p{color:blue}'
    )
  );

  test(
    'should not trim meaningful spaces',
    passthroughCSS('H2 p,h1 p{color:blue}')
  );

  test(
    'should reduce meaningful spaces',
    processCSS('h1    p,h2     p{color:blue}', 'h1 p,h2 p{color:blue}')
  );
});

suite('universal selector', () => {
  test(
    'should remove qualified universal selectors',
    processCSS(
      '*#id,*.test,*:not(.green),*[href]{color:blue}',
      '#id,.test,:not(.green),[href]{color:blue}'
    )
  );

  test(
    'should remove complex qualified universal selectors',
    processCSS(
      '[class] + *[href] *:not(*.green){color:blue}',
      '[class]+[href] :not(.green){color:blue}'
    )
  );

  test(
    'should remove complex qualified universal selectors (2)',
    processCSS('*:not(*.green) ~ *{color:blue}', ':not(.green)~*{color:blue}')
  );

  test(
    'should not remove meaningful universal selectors',
    processCSS(
      '* + *, * > *, * h1, * ~ *{color:blue}',
      '* h1,*+*,*>*,*~*{color:blue}'
    )
  );

  test(
    'should preserve the universal selector between comments',
    passthroughCSS('/*comment*/*/*comment*/{color:blue}')
  );

  test(
    'should preserve the universal selector in attribute selectors',
    processCSS(
      'h1[class=" *.js "] + *.js{color:blue}',
      'h1[class=" *.js "]+.js{color:blue}'
    )
  );

  test(
    'should preserve the universal selector in filenames',
    passthroughCSS('[filename="*.js"]{color:blue}')
  );

  test(
    'should preserve the universal selector in file globs',
    passthroughCSS('[glob="/**/*.js"]{color:blue}')
  );
});

suite('normalization', () => {
  test(
    'should preserve escaped zero plus sequences',
    passthroughCSS('.\\31 0\\+,.\\31 5\\+,.\\32 0\\+{color:blue}')
  );

  test(
    'should handle deep combinators',
    processCSS(
      'body /deep/ .theme-element{color:blue}',
      'body/deep/.theme-element{color:blue}'
    )
  );
});

suite('sorting and deduplication', () => {
  test(
    'should sort',
    processCSS(
      '.item1, .item2, .item10, .item11{color:blue}',
      '.item1,.item10,.item11,.item2{color:blue}'
    )
  );

  test(
    'should not sort',
    processCSS(
      '.item1, .item2, .item10, .item11{color:blue}',
      '.item1,.item2,.item10,.item11{color:blue}',
      { sort: false }
    )
  );

  test(
    'should dedupe selectors',
    processCSS(
      'h1,h2,h3,h4,h5,h5,h6{color:blue}',
      'h1,h2,h3,h4,h5,h6{color:blue}'
    )
  );
});

suite(':not() pseudo-class', () => {
  test(
    'should trim spaces in :not()',
    processCSS(
      'h1:not(.article, .comments){color:blue}',
      'h1:not(.article,.comments){color:blue}'
    )
  );

  test(
    'should trim spaces in :not() (2)',
    processCSS(
      'h1:not(.article, .comments), h2:not(.lead, .recommendation){color:blue}',
      'h1:not(.article,.comments),h2:not(.lead,.recommendation){color:blue}'
    )
  );

  test(
    'should dedupe simple selectors inside :not()',
    processCSS(
      'h1:not(h2, h3, h4, h5, h5, h6){color:blue}',
      'h1:not(h2,h3,h4,h5,h6){color:blue}'
    )
  );

  test('should dedupe large nested :is() and :not() selector lists in first-occurrence order', async () => {
    const selectors = Array.from(
      { length: 100 },
      (_, index) => `.item-${index % 20}`
    ).join(',');
    const uniqueSelectors = Array.from(
      { length: 20 },
      (_, index) => `.item-${index}`
    ).join(',');
    const input = `:is(${selectors},:not(${selectors})){color:blue}`;
    const output = `:is(${uniqueSelectors},:not(${uniqueSelectors})){color:blue}`;

    await processCSS(input, output, { sort: false })();
  });

  test(
    'should dedupe nested :is() and :not() selector lists independently',
    processCSS(
      ':is(:not(:is(.first,.second,.first),:is(.first,.second,.first))){color:blue}',
      ':is(:not(:is(.first,.second))){color:blue}',
      { sort: false }
    )
  );

  test(
    'outer lists deduplicate based on serialized text even when comments or formatting differ',
    processCSS('h1 /* c1 */, h1 /* c2 */, h1{color:blue}', 'h1{color:blue}')
  );

  test(
    'outer lists preserve distinct serialized entries with differing important comments despite matching base nodes',
    processCSS(
      'h1 /*! c1 */, h1 /*! c2 */{color:blue}',
      'h1 /*! c1 */,h1 /*! c2 */{color:blue}',
      { sort: false }
    )
  );

  test(
    'short inner lists deduplicate by structural identity preserving order',
    processCSS(
      ':is(.a, .b, .a, .c, .b){color:blue}',
      ':is(.a,.b,.c){color:blue}'
    )
  );

  test('inner lists crossing 16-element threshold transition cleanly to serialized text deduplication', async () => {
    const items = Array.from({ length: 25 }, (_, i) => `.cls-${i % 20}`);
    const expected = Array.from({ length: 20 }, (_, i) => `.cls-${i}`);
    await processCSS(
      `:is(${items.join(',')}){color:blue}`,
      `:is(${expected.join(',')}){color:blue}`,
      { sort: false }
    )();
  });

  test('inner lists deduplicate identical output selectors with differing source comments across 15/16 transition index', async () => {
    const prefix = Array.from({ length: 15 }, (_, i) => `.cls-${i}`);
    const input = `:is(${prefix.join(',')}, .target /* c1 */, .target /* c2 */){color:blue}`;
    const expected = `:is(${prefix.join(',')},.target){color:blue}`;
    await processCSS(input, expected, { sort: false })();
  });

  test('short inner lists deduplicate identical output selectors with differing source comments', async () => {
    const prefix = Array.from({ length: 14 }, (_, i) => `.cls-${i}`);
    const input = `:is(${prefix.join(',')}, .target /* c1 */, .target /* c2 */){color:blue}`;
    const expected = `:is(${prefix.join(',')},.target){color:blue}`;
    await processCSS(input, expected, { sort: false })();
  });

  test('inner lists preserve distinct serialized entries with differing important comments across 15/16 transition index', async () => {
    const prefix = Array.from({ length: 15 }, (_, i) => `.cls-${i}`);
    const input = `:is(${prefix.join(',')}, .target /*! c1 */, .target /*! c2 */){color:blue}`;
    const expected = `:is(${prefix.join(',')},.target /*! c1 */,.target /*! c2 */){color:blue}`;
    await processCSS(input, expected, { sort: false })();
  });
});
