import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

const body = '0%{opacity:0}to{opacity:1}';
const keyframes = `@keyframes a{${body}}@keyframes b{${body}}`;
const counterStyles =
  '@counter-style a{system:cyclic;symbols:"A"}@counter-style b{system:cyclic;symbols:"A"}';

test(
  'should not remove a keyframes name that a custom property holds',
  passthroughCSS(`${keyframes}:root{--n:a}div{animation:var(--n)}`)
);

test(
  'should not remove a keyframes name that a custom property holds as a string',
  passthroughCSS(`${keyframes}:root{--n:"a"}div{animation:var(--n)}`)
);

test(
  'should not remove a keyframes name that a var() fallback holds',
  passthroughCSS(`${keyframes}div{animation:1s var(--n,a)}`)
);

test(
  'should not remove a keyframes name that a var() fallback holds as a string',
  passthroughCSS(`${keyframes}div{animation:1s var(--n,"a")}`)
);

test(
  'should not remove a keyframes name that a custom property holds when a longhand uses var()',
  passthroughCSS(
    `${keyframes}div{animation:a 1s;animation-name:var(--n)}:root{--n:a}`
  )
);

test(
  'should not remove a counter style name that a custom property holds',
  passthroughCSS(`${counterStyles}:root{--n:a}ul{list-style-type:var(--n)}`)
);

test(
  'should not remove a counter style name that a var() fallback holds',
  passthroughCSS(`${counterStyles}ul{list-style-type:var(--n,a)}`)
);

test(
  'should not remove a keyframes name that an @property initial-value holds',
  passthroughCSS(
    `@property --n{syntax:'<custom-ident>';inherits:false;initial-value:a}${keyframes}`
  )
);

test(
  'should still rename to a name that a custom property holds',
  processCSS(
    `${keyframes}:root{--n:b}div{animation:a 1s}`,
    `@keyframes b{${body}}:root{--n:b}div{animation:b 1s}`
  )
);

test(
  'should still rewrite arguments of functions other than var() as references to nothing',
  processCSS(
    `${keyframes}div{animation:a 1s steps(4,jump-start),b 1s foo(a)}`,
    `@keyframes b{${body}}div{animation:b 1s steps(4,jump-start),b 1s foo(a)}`
  )
);
