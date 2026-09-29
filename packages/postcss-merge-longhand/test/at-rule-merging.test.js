import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

describe('container at-rule declaration merging', () => {
  test(
    'merges box longhands inside @page at-rules',
    processCSS(
      '@page{margin-top:10px;margin-right:10px;margin-bottom:10px;margin-left:10px}',
      '@page{margin:10px}'
    )
  );

  test(
    'merges box overrides onto preceding shorthand inside @page at-rules',
    processCSS(
      '@page{margin:0;margin-top:10px;margin-bottom:10px}',
      '@page{margin:10px 0}'
    )
  );

  test(
    'minifies box shorthand identities inside @page at-rules',
    processCSS('@page{margin:10px 10px 10px 10px}', '@page{margin:10px}')
  );

  test(
    'merges box longhands inside @position-try at-rules',
    processCSS(
      '@position-try --custom{margin-top:5px;margin-right:5px;margin-bottom:5px;margin-left:5px}',
      '@position-try --custom{margin:5px}'
    )
  );

  test(
    'merges column longhands inside @page at-rules',
    processCSS(
      '@page{column-width:100px;column-count:2}',
      '@page{columns:100px 2}'
    )
  );

  test(
    'merges column longhands inside @position-try at-rules',
    processCSS(
      '@position-try --custom{column-width:100px;column-count:2}',
      '@position-try --custom{columns:100px 2}'
    )
  );

  test(
    'merges border-radius longhands inside @page at-rules',
    processCSS(
      '@page{border-top-left-radius:5px;border-top-right-radius:5px;border-bottom-right-radius:5px;border-bottom-left-radius:5px}',
      '@page{border-radius:5px}'
    )
  );

  test(
    'merges border-radius longhands inside @position-try at-rules',
    processCSS(
      '@position-try --custom{border-top-left-radius:5px;border-top-right-radius:5px;border-bottom-right-radius:5px;border-bottom-left-radius:5px}',
      '@position-try --custom{border-radius:5px}'
    )
  );

  test(
    'reduces physical border longhands inside @page at-rules to component shorthands',
    processCSS(
      '@page{border-top:1px solid red;border-right:1px solid red;border-bottom:1px solid red;border-left:1px solid red}',
      '@page{border-color:red;border-style:solid;border-width:1px}'
    )
  );

  test(
    'merges box longhands inside nested at-rules under CSS Nesting',
    processCSS(
      'a{@media (min-width:600px){margin-top:10px;margin-bottom:10px;margin-left:10px;margin-right:10px}}',
      'a{@media (min-width:600px){margin:10px}}'
    )
  );

  test(
    'merges box longhands inside nested @supports at-rules under CSS Nesting',
    processCSS(
      'a{@supports (display:grid){margin-top:10px;margin-bottom:10px;margin-left:10px;margin-right:10px}}',
      'a{@supports (display:grid){margin:10px}}'
    )
  );

  test(
    'merges column longhands inside nested @container at-rules under CSS Nesting',
    processCSS(
      'a{@container card (min-width:400px){column-width:100px;column-count:2}}',
      'a{@container card (min-width:400px){columns:100px 2}}'
    )
  );
});
