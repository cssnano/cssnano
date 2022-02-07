'use strict';
const { test } = require('uvu');
const processCss = require('./_processCss');

test(
  'should merge margin values',
  processCss(
    'h1{margin-top:10px;margin-right:20px;margin-bottom:30px;margin-left:40px}',
    'h1{margin:10px 20px 30px 40px}'
  )
);

test(
  'should merge margin values with !important',
  processCss(
    'h1{margin-top:10px!important;margin-right:20px!important;margin-bottom:30px!important;margin-left:40px!important}',
    'h1{margin:10px 20px 30px 40px!important}'
  )
);

test(
  'should merge & then condense margin values',
  processCss(
    'h1{margin-top:10px;margin-bottom:10px;margin-left:10px;margin-right:10px}',
    'h1{margin:10px}'
  )
);

test(
  'should not merge margin values with mixed !important',
  processCss(
    'h1{margin-top:10px!important;margin-right:20px;margin-bottom:30px!important;margin-left:40px}',
    'h1{margin-bottom:30px!important;margin-left:40px;margin-right:20px;margin-top:10px!important}'
  )
);

test(
  'should merge padding values',
  processCss(
    'h1{padding-top:10px;padding-right:20px;padding-bottom:30px;padding-left:40px}',
    'h1{padding:10px 20px 30px 40px}'
  )
);

test(
  'should merge padding values with !important',
  processCss(
    'h1{padding-top:10px!important;padding-right:20px!important;padding-bottom:30px!important;padding-left:40px!important}',
    'h1{padding:10px 20px 30px 40px!important}'
  )
);

test(
  'should not merge padding values with mixed !important',
  processCss(
    'h1{padding-top:10px!important;padding-right:20px;padding-bottom:30px!important;padding-left:40px}',
    'h1{padding-bottom:30px!important;padding-left:40px;padding-right:20px;padding-top:10px!important}'
  )
);

test(
  'should merge identical border values',
  processCss(
    'h1{border-top:1px solid #000;border-bottom:1px solid #000;border-left:1px solid #000;border-right:1px solid #000}',
    'h1{border:1px solid #000}'
  )
);

test(
  'should merge identical border values with !important',
  processCss(
    'h1{border-top:1px solid #000!important;border-bottom:1px solid #000!important;border-left:1px solid #000!important;border-right:1px solid #000!important}',
    'h1{border:1px solid #000!important}'
  )
);

test(
  'should not merge identical border values with mixed !important',
  processCss(
    'h1{border-top:1px solid #000;border-bottom:1px solid #000;border-left:1px solid #000!important;border-right:1px solid #000!important}',
    'h1{border-bottom:1px solid #000;border-left:1px solid #000!important;border-right:1px solid #000!important;border-top:1px solid #000}'
  )
);

test(
  'should merge border values',
  processCss(
    'h1{border-color:red;border-width:1px;border-style:dashed}',
    'h1{border:1px dashed red}'
  )
);

test(
  'should merge border values with !important',
  processCss(
    'h1{border-color:red!important;border-width:1px!important;border-style:dashed!important}',
    'h1{border:1px dashed red!important}'
  )
);

test(
  'should merge border values with identical values for all sides',
  processCss(
    'h1{border-color:red red red red;border-width:1px 1px 1px 1px;border-style:solid solid solid solid}',
    'h1{border:1px solid red}'
  )
);

test(
  'should not merge border values with mixed !important',
  processCss(
    'h1{border-color:red;border-width:1px!important;border-style:dashed!important}',
    'h1{border-color:red;border-style:dashed!important;border-width:1px!important}'
  )
);

test(
  'should convert 4 values to 1',
  processCss('h1{margin:10px 10px 10px 10px}', 'h1{margin:10px}')
);

test(
  'should convert 3 values to 1',
  processCss('h1{margin:10px 10px 10px}', 'h1{margin:10px}')
);

test(
  'should convert 3 values to 2',
  processCss('h1{margin:10px 20px 10px}', 'h1{margin:10px 20px}')
);

test(
  'should convert 2 values to 1',
  processCss('h1{margin:10px 10px}', 'h1{margin:10px}')
);

test(
  'should convert 1 value to 1',
  processCss('h1{margin:10px}', 'h1{margin:10px}')
);

test(
  'should convert 4 values to 2',
  processCss('h1{margin:10px 20px 10px 20px}', 'h1{margin:10px 20px}')
);

test(
  'should convert 4 values to 3',
  processCss('h1{margin:10px 20px 30px 20px}', 'h1{margin:10px 20px 30px}')
);

test(
  'should convert 4 values to 4',
  processCss('h1{margin:10px 20px 30px 40px}', 'h1{margin:10px 20px 30px 40px}')
);

test(
  'save fallbacks if after them goes custom css props',
  processCss(
    'h1{padding:1em;padding:var(--variable)}',
    'h1{padding:1em;padding:var(--variable)}'
  )
);

test(
  'overwrite custom css props if after them goes same props',
  processCss('h1{padding:var(--variable);padding:1em}', 'h1{padding:1em}')
);

test(
  'overwrite custom css props if after them goes same props (2)',
  processCss(
    'h1{padding:var(--first);padding:var(--second)}',
    'h1{padding:var(--second)}'
  )
);

test(
  'should not break unmergeable rules with custom props',
  processCss('h1{padding:var(--variable)}', 'h1{padding:var(--variable)}')
);

test(
  'should not merge rule if it includes mixed values',
  processCss(
    'h1{padding-top:10px;padding-right:15px;padding-bottom:20px;padding-left:var(--variable)}',
    'h1{padding-bottom:20px;padding-left:var(--variable);padding-right:15px;padding-top:10px}'
  )
);

test(
  'should merge rules with custom props',
  processCss(
    'h1{padding-top:var(--variable);padding-right:var(--variable);padding-bottom:var(--variable);padding-left:var(--variable)}',
    'h1{padding:var(--variable)}'
  )
);

test(
  'should merge props and dont remove fallbacks',
  processCss(
    'h1{padding-top:10px;padding-right:15px;padding-bottom:20px;padding-left:25px;padding-top:var(--variable);padding-right:var(--variable);padding-bottom:var(--variable);padding-left:var(--variable)}',
    'h1{padding:10px 15px 20px 25px;padding:var(--variable)}'
  )
);

test(
  'should merge props and overwrite',
  processCss(
    'h1{padding-top:var(--variable);padding-right:var(--variable);padding-bottom:var(--variable);padding-left:var(--variable);padding-top:10px;padding-right:15px;padding-bottom:20px;padding-left:25px}',
    'h1{padding:10px 15px 20px 25px}'
  )
);

test(
  'should overwrite some props and save fallbacks',
  processCss(
    'h1{padding-top:10px;padding-right:var(--variable);padding-right:15px;padding-bottom:var(--variable);padding-bottom:20px;padding-left:25px;padding-top:var(--variable);padding-left:var(--variable)}',
    'h1{padding:10px 15px 20px 25px;padding-left:var(--variable);padding-top:var(--variable)}'
  )
);
test.run();
