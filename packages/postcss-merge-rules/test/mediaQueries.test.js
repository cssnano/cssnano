import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should merge in media queries',
  processCSS(
    '@media print{h1{display:block}h1{color:red}}',
    '@media print{h1{display:block;color:red}}'
  )
);

test(
  'should merge in media queries (2)',
  processCSS(
    '@media print{h1{display:block}p{display:block}}',
    '@media print{h1,p{display:block}}'
  )
);

test(
  'should merge in media queries (3)',
  processCSS(
    '@media print{h1{color:red;text-decoration:none}h2{text-decoration:none}}h3{text-decoration:none}',
    '@media print{h1{color:red}h1,h2{text-decoration:none}}h3{text-decoration:none}'
  )
);

test(
  'should merge in media queries (4)',
  processCSS(
    'h3{text-decoration:none}@media print{h1{color:red;text-decoration:none}h2{text-decoration:none}}',
    'h3{text-decoration:none}@media print{h1{color:red}h1,h2{text-decoration:none}}'
  )
);

test(
  'should not merge across media queries',
  passthroughCSS(
    '@media screen and (max-width:480px){h1{display:block}}@media screen and (min-width:480px){h2{display:block}}'
  )
);

test(
  'should not merge across media queries (2)',
  passthroughCSS(
    '@media screen and (max-width:200px){h1{color:red}}@media screen and (min-width:480px){h1{display:block}}'
  )
);

test(
  'should not merge in different contexts',
  passthroughCSS('h1{display:block}@media print{h1{color:red}}')
);

test(
  'should not merge in different contexts (2)',
  passthroughCSS('@media print{h1{display:block}}h1{color:red}')
);

test(
  'should merge multiple media queries',
  processCSS(
    '@media print{h1{display:block}}@media print{h1{color:red}}',
    '@media print{h1{display:block;color:red}}@media print{}'
  )
);

test(
  'should merge multiple media queries (uppercase)',
  processCSS(
    '@media print{h1{display:block}}@MEDIA print{h1{color:red}}',
    '@media print{h1{display:block;color:red}}@MEDIA print{}'
  )
);

test(
  'should merge @media inside @layer with custom properties',
  passthroughCSS(`@layer utilities {
  .dark\\:border-zinc-700 {
    @media (prefers-color-scheme: dark) {
      border-color: var(--color-zinc-700);
    }
  }
  .dark\\:bg-black {
    @media (prefers-color-scheme: dark) {
      background-color: var(--color-black);
    }
  }
  .dark\\:bg-neutralDark {
    @media (prefers-color-scheme: dark) {
      background-color: var(--color-neutralDark);
    }
  }
  .dark\\:text-gray-200 {
    @media (prefers-color-scheme: dark) {
      color: var(--color-gray-200);
    }
  }
  .dark\\:text-white {
    @media (prefers-color-scheme: dark) {
      color: var(--color-white);
    }
  }
}`)
);

test(
  'should merge multiple values across at-rules',
  processCSS(
    [
      '@media (width:40px){h1{border:1px solid red;background-color:red;background-position:50% 100%}}',
      '@media (width:40px){h1{border:1px solid red;background-color:red}}',
      '@media (width:40px){h1{border:1px solid red}}',
    ].join(''),
    [
      '@media (width:40px){h1{border:1px solid red;background-color:red;background-position:50% 100%}}',
      '@media (width:40px){}',
      '@media (width:40px){}',
    ].join('')
  )
);

test(
  'should prefer the smaller opposite-direction partial merge across at-rules',
  processCSS(
    [
      '@media (width:40px){h1{color:black}h2{color:black;font-weight:bold}}',
      '@media (width:40px){h3{color:black;font-weight:bold}}',
    ].join(''),
    [
      '@media (width:40px){h1,h2,h3{color:black}h2,h3{font-weight:bold}}',
      '@media (width:40px){}',
    ].join('')
  )
);

test(
  'should merge identical media queries without reordering conflicting nth-child rules',
  processCSS(
    `@media screen and (min-width:1601px) {
  .container .card:not(.nomargin) {
    width: 15%;
    margin-right: 1%;
    margin-left: 1%
  }

  .container .card:not(.nomargin):nth-child(6n) {
    margin-right: 0
  }

  .container .card:not(.nomargin):nth-child(6n-5) {
    margin-left: 0
  }
}
@media screen and (min-width:1601px) {
  .container .card:not(.nomargin) {
    width: 18.4%;
    margin-right: 1%;
    margin-left: 1%
  }

  .container .card:not(.nomargin):nth-child(6n) {
    margin-right: 1%
  }

  .container .card:not(.nomargin):nth-child(6n-5) {
    margin-left: 1%
  }

  .container .card:not(.nomargin):nth-child(5n) {
    margin-right: 0
  }

  .container .card:not(.nomargin):nth-child(5n-4) {
    margin-left: 0
  }
}`,
    `@media screen and (min-width:1601px) {
  .container .card:not(.nomargin) {
    width: 15%;
    margin-right: 1%;
    margin-left: 1%
  }

  .container .card:not(.nomargin):nth-child(6n) {
    margin-right: 0
  }

  .container .card:not(.nomargin):nth-child(6n-5) {
    margin-left: 0
  }
  .container .card:not(.nomargin) {
    width: 18.4%;
    margin-right: 1%;
    margin-left: 1%
  }

  .container .card:not(.nomargin):nth-child(6n) {
    margin-right: 1%
  }

  .container .card:not(.nomargin):nth-child(6n-5) {
    margin-left: 1%
  }

  .container .card:not(.nomargin):nth-child(5n) {
    margin-right: 0
  }

  .container .card:not(.nomargin):nth-child(5n-4) {
    margin-left: 0
  }
}
@media screen and (min-width:1601px) {
}`
  )
);
