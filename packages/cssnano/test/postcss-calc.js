'use strict';
const { test } = require('uvu');
const processCss = require('./_processCss');

test(
  'should optimise inside calc',
  processCss('h1{width:calc(var(--h) * 1em)}', 'h1{width:calc(var(--h)*1em)}')
);

test(
  'should optimise inside calc (1)',
  processCss(
    'h1{width:calc(1.5em / var(--h))}',
    'h1{width:calc(1.5em/var(--h))}'
  )
);

test(
  'should optimise inside calc (2)',
  processCss(
    'h1{--a:calc(var(--x, 1) * 10vw)}',
    'h1{--a:calc(var(--x, 1)*10vw)}'
  )
);

test(
  'should optimise inside calc (3)',
  processCss(
    'h1{width:calc(calc(2.25rem + 2px) - 1px * 2)}',
    'h1{width:2.25rem}'
  )
);

test(
  'should optimise inside calc (4)',
  processCss(
    'h1{width:calc(env(safe-area-inset-bottom) * 3) !important}',
    'h1{width:calc(env(safe-area-inset-bottom)*3)!important}'
  )
);

test(
  'should optimise inside calc (5)',
  processCss(
    'h1{width:calc(14px + 6 * ((100vw - 320px) / 448))}',
    'h1{width:calc(9.71429px + 1.33929vw)}'
  )
);

test(
  'should optimise inside calc (6)',
  processCss('h1{width:calc((100px - 1em) + (-50px + 1em))}', 'h1{width:50px}')
);

test(
  'should optimise inside calc (7)',
  processCss('h1{width:calc(50% + (5em + 5%))}', 'h1{width:calc(55% + 5em)}')
);

test(
  'should optimise inside calc (8)',
  processCss('h1{width:calc((99.99% * 1/1) - 0rem)}', 'h1{width:99.99%}')
);

test(
  'should optimise inside calc (9)',
  processCss(
    'h1{margin:1px 1px calc(0.5em + 1px)}',
    'h1{margin:1px 1px calc(.5em + 1px)}'
  )
);

test(
  'should keep spaces in calc',
  processCss('h1{width:calc(100% * 120px)}', 'h1{width:calc(100%*120px)}')
);

test(
  'should keep spaces in calc (2)',
  processCss('h1{width:calc(100% + 120px)}', 'h1{width:calc(100% + 120px)}')
);

test(
  'should keep spaces in calc (3)',
  processCss(
    'h1{width:calc(1.5em + var(--h))}',
    'h1{width:calc(1.5em + var(--h))}'
  )
);

test(
  'should keep spaces in calc (4)',
  processCss(
    'h1{width:calc(1.5em - var(--h))}',
    'h1{width:calc(1.5em - var(--h))}'
  )
);

test(
  'should keep spaces in calc (5)',
  processCss(
    'h1{width:calc(100% - var(--my-var))}',
    'h1{width:calc(100% - var(--my-var))}'
  )
);
test.run();
