import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

describe('Columns', () => {
  test(
    'should order columns with an auto column count last',
    processCSS(
      'h1 {columns: 2 auto;columns: auto 12em;columns: auto auto;}',
      'h1 {columns: auto 2;columns: 12em auto;columns: auto auto;}'
    )
  );

  test(
    'should pass through already ordered columns declaration',
    passthroughCSS('h1 {columns: auto 2;}')
  );

  test(
    'should order columns declarations width first',
    processCSS('h1 {columns: 2 20px;}', 'h1 {columns: 20px 2;}')
  );

  test(
    'should pass through already ordered columns declaration',
    passthroughCSS('h1 {columns: 20px 2;}')
  );

  test(
    'should not reorder columns when the width is a percentage',
    passthroughCSS('h1 {columns: 2 50%;columns: 50% 2;}')
  );

  test(
    'should not crash on invalid columns declarations',
    passthroughCSS(
      'h1 {columns: 2px 2px; columns: inherit 3rem; columns: 3rem 2 12em;}'
    )
  );

  test(
    'should reject CSS-wide keywords combined with a value in columns',
    passthroughCSS(
      'h1 {columns: inherit 3rem; columns: 3rem inherit; columns: initial 20px; columns: unset 20px; columns: revert 20px; columns: revert-layer 20px;}'
    )
  );

  test(
    'should reject invalid idents in columns',
    passthroughCSS(
      'h1 {columns: foo 20px; columns: 20px foo; columns: none 20px;}'
    )
  );

  test(
    'should reject invalid column counts',
    passthroughCSS('h1 {columns: 0 20px; columns: -2 20px; columns: 2.5 20px;}')
  );

  test(
    'should order column counts with explicit plus sign',
    processCSS('h1 {columns: +2 20px;}', 'h1 {columns: 20px +2;}')
  );

  test(
    'should reject invalid column widths',
    passthroughCSS(
      'h1 {columns: 2 1foo; columns: 2 -1px; columns: 2 10deg; columns: 2 10s;}'
    )
  );

  test(
    'should pass through columns when a term cannot be classified',
    passthroughCSS('h1{columns:2 20px calc(1px);columns:20px 2 invalid()}')
  );

  test(
    'preserves calc() column widths as an intentional limitation',
    passthroughCSS('h1{columns:2 calc(20px);columns:calc(20px) 2}')
  );
});

describe('Grid', () => {
  test(
    'should order grid-auto-flow',
    processCSS(
      'grid-auto-flow: column;grid-auto-flow: dense column; grid-auto-flow: unset;grid-auto-flow: row dense;',
      'grid-auto-flow: column;grid-auto-flow: column dense; grid-auto-flow: unset;grid-auto-flow: row dense;'
    )
  );

  test(
    'should match grid-auto-flow keywords case-insensitively',
    processCSS(
      'a{grid-auto-flow:DENSE column;grid-column-gap:NORMAL 1px}',
      'a{grid-auto-flow:column DENSE;grid-column-gap:NORMAL 1px}'
    )
  );

  test(
    'should pass through grid-auto-flow with an unknown term',
    passthroughCSS('a{grid-auto-flow:dense junk row}')
  );

  test(
    'should pass through duplicate grid-auto-flow keywords',
    passthroughCSS('a{grid-auto-flow:row column;grid-auto-flow:dense dense}')
  );

  test(
    'should pass through multi-value grid-column-gap declarations',
    passthroughCSS(
      'grid-column-gap: normal; grid-column-gap: normal 3%; grid-column-gap: 3em normal;'
    )
  );

  test(
    'should pass through duplicate grid gap keywords',
    passthroughCSS('a{grid-column-gap:normal normal}')
  );

  test(
    'should pass through invalid grid-line combinations',
    passthroughCSS(
      'a{grid-column:foo span bar / 4;grid-column:span foo bar / 4;grid-column:2 foo bar / 4;grid-column:span span / 4;grid-column:2 / 3 / 4}'
    )
  );

  test(
    'should pass through grid-lines with two integers or an auto companion',
    passthroughCSS(
      'a{grid-column:2 3 / 4;grid-column:2 auto / 4;grid-column:auto 3 / 4}'
    )
  );

  test(
    'should normalize negative ordinary grid-line integers',
    processCSS('a{grid-column:foo -2 / 3}', 'a{grid-column:-2 foo/3}')
  );

  test(
    'should pass through fractional and negative span integers',
    passthroughCSS('a{grid-column:span 1.5 / 2;grid-column:span -2 / 2}')
  );

  test(
    'should pass through excluded grid custom-ident keywords',
    passthroughCSS(
      'a{grid-column:SpAn 2/3;grid-column:DeFaUlT 2 / 3;grid-column:ReVeRt-LaYeR 2 / 3;grid-column:\\61 uto 2 / 3}'
    )
  );

  test(
    'should pass through zero integers and CSS-wide keywords in grid-lines',
    passthroughCSS(
      'a{grid-column:0 / 2;grid-column:0 span / 2;grid-column:span 0 / 2;grid-column:initial / 2;grid-column:2 inherit / 3;grid-column:span -2 / 2}'
    )
  );

  test(
    'should normalize none as a grid custom-ident',
    processCSS('a{grid-column:none span / 2}', 'a{grid-column:span none/2}')
  );

  test(
    'should normalize span grid-lines with an integer and custom-ident',
    processCSS(
      'a{grid-column:foo 2 span / 4;grid-row-start:span 2 foo}',
      'a{grid-column:span 2 foo/4;grid-row-start:span 2 foo}'
    )
  );

  test(
    'should match escaped and mixed-case grid identifiers',
    processCSS(
      'a{grid-column:N\\6eNe SpAn / 2}',
      'a{grid-column:SpAn N\\6eNe/2}'
    )
  );

  test(
    'should pass through a bare span grid-line',
    passthroughCSS('a{grid-column:2/span;grid-column:span / 2}')
  );

  test(
    'should pass through multi-value grid-row-gap declarations',
    passthroughCSS(
      'grid-row-gap: normal; grid-row-gap: normal 3%; grid-row-gap: 3em normal;'
    )
  );

  test(
    'should order grid-column',
    processCSS(
      'grid-column: 2/4; grid-column: 2 span/7; grid-column: auto;grid-column: 3;grid-column: custom-indent-name / 3;',
      'grid-column: 2/4; grid-column: span 2/7; grid-column: auto;grid-column: 3;grid-column: custom-indent-name/3;'
    )
  );

  test(
    'should pass through nested slashes while ordering grid lines',
    processCSS(
      'a{grid-column:2/span min(1px/2px);}',
      'a{grid-column:2/span min(1px/2px);}'
    )
  );

  test(
    'should order grid-row',
    processCSS(
      'grid-row: 2/4; grid-row: 2 span/7; grid-row: auto;grid-row: 3;grid-row: custom-indent-name / 3;',
      'grid-row: 2/4; grid-row: span 2/7; grid-row: auto;grid-row: 3;grid-row: custom-indent-name/3;'
    )
  );

  test(
    'should pass through slashes in grid-row-start (single grid-line longhand)',
    passthroughCSS(
      'grid-row-start: 2 / 4; grid-row-start: 2 span / 7; grid-row-start: custom-indent-name / 3;'
    )
  );

  test(
    'should normalize a single-line span in grid-row-start',
    processCSS('grid-row-start: 2 span', 'grid-row-start: span 2')
  );

  test(
    'should pass through slashes in grid-row-end (single grid-line longhand)',
    passthroughCSS(
      'grid-row-end: 2 / 4; grid-row-end: 2 span / 7; grid-row-end: custom-indent-name / 3;'
    )
  );

  test(
    'should pass through slashes in grid-column-start (single grid-line longhand)',
    passthroughCSS(
      'grid-column-start: 2 / 4; grid-column-start: 2 span / 7; grid-column-start: custom-indent-name / 3;'
    )
  );

  test(
    'should pass through slashes in grid-column-end (single grid-line longhand)',
    passthroughCSS(
      'grid-column-end: 2 / 4; grid-column-end: 2 span / 7; grid-column-end: custom-indent-name / 3;'
    )
  );
});
