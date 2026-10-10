import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Drop redundant range features in @media queries', () => {
  test(
    'should drop a min-width feature that a larger min-width in the same query already implies',
    processCSS(
      '@media (min-width:768px) and (min-width:320px){h1{color:red}}',
      '@media(min-width:768px){h1{color:red}}'
    )
  );

  test(
    'should drop the first min-width feature when a larger one follows it',
    processCSS(
      '@media (min-width:320px) and (min-width:768px){h1{color:red}}',
      '@media(min-width:768px){h1{color:red}}'
    )
  );

  test(
    'should keep the smaller of two max-width features in the same query',
    processCSS(
      '@media screen and (max-width:320px) and (max-width:768px){h1{color:red}}',
      '@media screen and (max-width:320px){h1{color:red}}'
    )
  );

  test(
    'should keep the largest of three min-width features in the same query',
    processCSS(
      '@media (min-width:1px) and (min-width:3px) and (min-width:2px){h1{color:red}}',
      '@media(min-width:3px){h1{color:red}}'
    )
  );

  test(
    'should drop a repeated min-width feature with an identical value',
    processCSS(
      '@media (min-width:320px) and (min-width:320px){h1{color:red}}',
      '@media(min-width:320px){h1{color:red}}'
    )
  );

  test(
    'should keep unrelated features when a redundant range feature is dropped',
    processCSS(
      '@media screen and (min-width:768px) and (orientation:landscape) and (min-width:320px){h1{color:red}}',
      '@media screen and (min-width:768px) and (orientation:landscape){h1{color:red}}'
    )
  );

  test(
    'should compare lengths exactly, so values that round to the same double are not treated as equal',
    processCSS(
      '@media (min-width:9007199254740992px) and (min-width:9007199254740993px){h1{color:red}}',
      '@media(min-width:9007199254740993px){h1{color:red}}'
    )
  );

  // Features with different units compare differently in each unit, and `em`
  // is not a fixed multiple of `px` for a user, so both must stay.
  test(
    'should keep min-width features whose units differ',
    passthroughCSS(
      '@media(min-width:40em) and (min-width:320px){h1{color:red}}'
    )
  );

  // `or` makes the query a disjunction, so dropping a feature would widen it.
  test(
    'should keep min-width features joined by or',
    passthroughCSS(
      '@media(min-width:768px) or (min-width:320px){h1{color:red}}'
    )
  );

  // Features in separate comma-separated queries are alternatives, not a
  // conjunction, so neither can be dropped. The queries are sorted as usual.
  test(
    'should keep min-width features in separate comma-separated queries',
    processCSS(
      '@media (min-width:768px),(min-width:320px){h1{color:red}}',
      '@media(min-width:320px),(min-width:768px){h1{color:red}}'
    )
  );

  // `not` negates the whole conjunction, so the query is left as written.
  test(
    'should keep min-width features in a query that uses not',
    passthroughCSS(
      '@media not screen and (min-width:768px) and (min-width:320px){h1{color:red}}'
    )
  );

  // A min- and a max- feature bound different sides of the viewport.
  test(
    'should keep a min-width and a max-width feature in the same query',
    passthroughCSS(
      '@media(min-width:320px) and (max-width:768px){h1{color:red}}'
    )
  );

  test(
    'should drop every min-width feature that the largest of a run of them implies',
    processCSS(
      '@media (min-width:1px) and (min-width:2px) and (min-width:3px){h1{color:red}}',
      '@media(min-width:3px){h1{color:red}}'
    )
  );

  test(
    'should keep both features that set width exactly, because an exact width is not a bound',
    passthroughCSS('@media(width:100px) and (width:200px){h1{color:red}}')
  );

  // A negative bound is outside the unsigned exact form the comparison reads,
  // so the feature is kept rather than compared with the other bound.
  test(
    'should keep a negative min-width feature, whose value has no exact form to compare',
    passthroughCSS('@media(min-width:-1px) and (min-width:2px){h1{color:red}}')
  );

  // The escaped unit is not the text of the unit's dimension, so its value is
  // not compared with the plain `px` feature.
  test(
    'should keep a min-width feature whose unit is written with an escape',
    passthroughCSS(
      '@media(min-width:1px) and (min-width:2\\70 x){h1{color:red}}'
    )
  );

  // The stray word makes the query more than a conjunction of features, so
  // removing a feature could widen the query.
  test(
    'should keep features after a media type that is followed by a stray word',
    passthroughCSS(
      '@media(min-width:1px) and (min-width:2px) print{h1{color:red}}'
    )
  );

  // With no media type before the first `and`, the query is invalid, so its
  // features are not rewritten.
  test(
    'should keep features in a query that starts with and',
    passthroughCSS(
      '@media and (min-width:1px) and (min-width:2px){h1{color:red}}'
    )
  );

  // A query has one media type at most, so two words before the first `and`
  // make it invalid and its features are not rewritten.
  test(
    'should keep features in a query with two media type words before and',
    passthroughCSS(
      '@media screen print and (min-width:1px) and (min-width:2px){h1{color:red}}'
    )
  );

  // `only` must be followed by a media type, so `only and` is invalid and its
  // features are not rewritten.
  test(
    'should keep features in a query where only is not followed by a media type',
    passthroughCSS(
      '@media only and (min-width:1px) and (min-width:2px){h1{color:red}}'
    )
  );

  // `only` must be followed by a media type, so a feature cannot follow it
  // directly and the query is invalid.
  test(
    'should keep features in a query where only is followed by a feature',
    passthroughCSS(
      '@media only (min-width:1px) and (min-width:2px){h1{color:red}}'
    )
  );

  // `only` is a keyword, not a media type, so it cannot stand in for one.
  test(
    'should keep features in a query where only is repeated before and',
    passthroughCSS(
      '@media only only and (min-width:1px) and (min-width:2px){h1{color:red}}'
    )
  );

  // A trailing `and` leaves the query without a feature after it, so the
  // query is invalid and its features are not rewritten.
  test(
    'should keep features in a query that ends with and',
    passthroughCSS(
      '@media(min-width:1px) and (min-width:2px) and{h1{color:red}}'
    )
  );

  test(
    'should drop a redundant min-width feature in a query whose all keyword is removed',
    processCSS(
      '@media all and (min-width:1px) and (min-width:2px){h1{color:red}}',
      '@media(min-width:2px){h1{color:red}}'
    )
  );

  test(
    'should drop a redundant later min-width feature in a query whose all keyword is removed',
    processCSS(
      '@media all and (min-width:2px) and (min-width:1px){h1{color:red}}',
      '@media(min-width:2px){h1{color:red}}'
    )
  );

  test(
    'should drop a redundant feature that has a comment between features',
    processCSS(
      '@media (min-width:768px) /* a */ and /* b */ (min-width:320px){h1{color:red}}',
      '@media(min-width:768px){h1{color:red}}'
    )
  );

  test(
    'should compare feature names and units without regard to case and keep the surviving feature as written',
    processCSS(
      '@media (MIN-WIDTH:768PX) and (min-width:320px){h1{color:red}}',
      '@media(MIN-WIDTH:768PX){h1{color:red}}'
    )
  );

  test(
    'should drop a redundant feature after only and a media type',
    processCSS(
      '@media only screen and (min-width:320px) and (min-width:768px){h1{color:red}}',
      '@media only screen and (min-width:768px){h1{color:red}}'
    )
  );

  test(
    'should drop a redundant feature in one query of a comma list and leave the other query as written',
    processCSS(
      '@media (min-width:320px) and (min-width:768px),print{h1{color:red}}',
      '@media(min-width:768px),print{h1{color:red}}'
    )
  );

  test(
    'should keep the smaller of two max-height features without a media type',
    processCSS(
      '@media (max-height:900px) and (max-height:600px){h1{color:red}}',
      '@media(max-height:600px){h1{color:red}}'
    )
  );

  test(
    'should keep the smaller of two max-width features in em',
    processCSS(
      '@media (max-width:40em) and (max-width:30em){h1{color:red}}',
      '@media(max-width:30em){h1{color:red}}'
    )
  );

  test(
    'should keep the larger of two min-width features in rem',
    processCSS(
      '@media (min-width:20rem) and (min-width:40rem){h1{color:red}}',
      '@media(min-width:40rem){h1{color:red}}'
    )
  );

  test(
    'should keep min-resolution features whose units differ, because dppx and dpi are not compared',
    passthroughCSS(
      '@media(min-resolution:2dppx) and (min-resolution:96dpi){h1{color:red}}'
    )
  );

  test('should give the same output when a query with a dropped feature is minified again', async () => {
    const once = await postcss([plugin]).process(
      '@media (min-width:768px) and (min-width:320px) and (max-width:2000px) and (max-width:1000px){h1{color:red}}',
      { from: undefined }
    );
    const twice = await postcss([plugin]).process(once.css, {
      from: undefined,
    });
    assert.equal(twice.css, once.css);
  });

  test(
    // A parser that predates Syntax 3 reads `1e3px` as an invalid token and drops the whole query, so the feature must stay.
    'should keep a feature with a lowercase exponent in its value when a larger bound would imply it',
    processCSS(
      '@media (min-width:2000px) and (min-width:1e3px){h1{color:red}}',
      '@media(min-width:2000px) and (min-width:1e3px){h1{color:red}}'
    )
  );

  test(
    // The same reason as the lowercase exponent: the uppercase `E` is equally invalid before Syntax 3.
    'should keep a feature with an uppercase exponent in its value when a larger bound would imply it',
    processCSS(
      '@media (min-width:2000px) and (min-width:1E3px){h1{color:red}}',
      '@media(min-width:2000px) and (min-width:1E3px){h1{color:red}}'
    )
  );

  test(
    // Unbalanced brackets stop the query before its features are read, so it stays as written.
    'should leave a query with an unclosed parenthesis unchanged',
    passthroughCSS(
      '@media (min-width:320px) and (min-width:768px{h1{color:red}}'
    )
  );
});
