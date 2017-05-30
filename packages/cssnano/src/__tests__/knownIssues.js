import test from 'ava';
import processCss from './_processCss';

/*
 * This is due to linear plugin order; postcss-merge-longhand runs
 * before postcss-merge-rules. However, if the order of the
 * processors is switched, other problems are created when
 * rules cannot be merged together due to the intersection of
 * declarations now being different.
 */

test.failing(
    'should merge duplicate padding values',
    processCss,
    `body { padding: 50px; } body { padding: 0; }`,
    `body{padding:0}`
);
