import test from 'ava';
import plugin from '..';
import {processCSSFactory} from '../../../../util/testHelpers';

const {passthroughCSS, processCSS} = processCSSFactory(plugin);

test(
    'should merge column values',
    processCSS,
    'h1{column-width:12em;column-count:auto}',
    'h1{columns:12em}'
);

test(
    'should minify column values',
    processCSS,
    'h1{column-width:auto;column-count:auto}',
    'h1{columns:auto}'
);

test(
    'should merge column-width with columns',
    processCSS,
    'h1{columns:12em auto;column-width:11em}',
    'h1{columns:11em}'
);

test(
    'should merge column width and column count',
    processCSS,
    'h1{column-width:6em;column-count:3}',
    'h1{columns:6em 3}'
);

test(
    'should pass through column width',
    passthroughCSS,
    'h1{column-width:6em}',
);

test(
    'should pass through column count',
    passthroughCSS,
    'h1{column-count:3}'
);

test(
    'should reduce inherit',
    processCSS,
    'h1{column-width:inherit;column-count:inherit}',
    'h1{columns:inherit}'
);

test(
    'should pass through auto',
    passthroughCSS,
    'h1{columns:auto}'
);

test(
    'should not merge declarations with hacks',
    passthroughCSS,
    'h1{column-width:12em;_column-count:auto}'
);

test(
    'should preserve nesting level',
    processCSS,
    'section{h1{column-width:12em;column-count:auto}}',
    'section{h1{columns:12em}}'
);

test(
    'should save fallbacks for column-width if after goes custom css props',
    processCSS,
    'h1{column-width:12em;column-width:var(--variable)}',
    'h1{column-width:12em;column-width:var(--variable)}'
);
