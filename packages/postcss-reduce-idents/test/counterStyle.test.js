import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Counter style', () => {
  test(
    'should rename counter styles',
    processCSS(
      '@counter-style custom{system:extends decimal;suffix:"> "}ol{list-style:custom}',
      '@counter-style a{system:extends decimal;suffix:"> "}ol{list-style:a}'
    )
  );

  test(
    'should rename counter styles (uppercase)',
    processCSS(
      '@COUNTER-STYLE custom{system:extends decimal;suffix:"> "}ol{LIST-STYLE:custom}',
      '@COUNTER-STYLE a{system:extends decimal;suffix:"> "}ol{LIST-STYLE:a}'
    )
  );

  test(
    'should rename multiple counter styles & be aware of extensions',
    processCSS(
      '@counter-style custom{system:extends decimal;suffix:"> "}@counter-style custom2{system:extends  custom;prefix:"-"}ol{list-style:custom2}',
      '@counter-style a{system:extends decimal;suffix:"> "}@counter-style b{system:extends  a;prefix:"-"}ol{list-style:b}'
    )
  );

  test(
    'should not touch counter styles that are not referenced in the file',
    passthroughCSS('@counter-style custom{system:extends decimal;suffix:"> "}')
  );

  test(
    'should not rename a descriptor keyword that reads as a counter style name',
    processCSS(
      [
        '@counter-style words{system:cyclic;symbols:"x"}',
        '@counter-style fixed{system:cyclic;symbols:"y"}',
        '@counter-style custom{system:fixed 3;symbols:"0";speak-as:words}',
        'ol{list-style:custom}',
      ].join(''),
      [
        '@counter-style words{system:cyclic;symbols:"x"}',
        '@counter-style fixed{system:cyclic;symbols:"y"}',
        '@counter-style a{system:fixed 3;symbols:"0";speak-as:words}',
        'ol{list-style:a}',
      ].join('')
    )
  );

  test(
    'should not touch list-styles that are not defined in the file',
    passthroughCSS('ol{list-style:custom2}')
  );

  test(
    'should rename a counter style referenced by a fallback descriptor',
    processCSS(
      '@counter-style custom{system:cyclic;symbols:"x"}@counter-style other{system:numeric;symbols:"0" "1";fallback:custom}ol{list-style-type:custom}',
      '@counter-style a{system:cyclic;symbols:"x"}@counter-style other{system:numeric;symbols:"0" "1";fallback:a}ol{list-style-type:a}'
    )
  );

  test(
    'should rename a counter style passed to a counter function',
    processCSS(
      '@counter-style custom{system:cyclic;symbols:"x"}ol{list-style-type:custom}li:before{content:counter(chapter,custom)}',
      '@counter-style a{system:cyclic;symbols:"x"}ol{list-style-type:a}li:before{content:counter(chapter,a)}'
    )
  );

  test(
    'should not rename a counter argument as a counter style',
    processCSS(
      '@counter-style custom{system:cyclic;symbols:"x"}ol{list-style-type:custom}li:before{content:counter(custom,decimal)}',
      '@counter-style a{system:cyclic;symbols:"x"}ol{list-style-type:a}li:before{content:counter(custom,decimal)}'
    )
  );

  test(
    'should not touch a counter style that reads as a list-style keyword',
    passthroughCSS(
      '@counter-style inside{system:cyclic;symbols:"x"}ol{list-style:inside inside}'
    )
  );

  test(
    'should tell a counter apart from the counter style beside it',
    processCSS(
      '@counter-style custom{system:cyclic;symbols:"x"}ol{list-style-type:custom}body{counter-reset:section}h3:before{content:counter(section,custom)}',
      '@counter-style a{system:cyclic;symbols:"x"}ol{list-style-type:a}body{counter-reset:a}h3:before{content:counter(a,a)}'
    )
  );

  test(
    'should rename counter-style with extra whitespace in at-rule params',
    processCSS(
      '@counter-style  custom  {system:cyclic}.one{list-style:custom}',
      '@counter-style  a  {system:cyclic}.one{list-style:a}'
    )
  );
});
