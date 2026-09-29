import { test } from 'node:test';
import processCss from './_processCss.js';

test(
  'should not escape legal characters',
  processCss.passthrough('h1{font-family:€42}')
);

test(
  'should not join identifiers in the shorthand property',
  processCss.passthrough('h1{font:italic "Bond 007 008 009",sans-serif}')
);

test(
  'should escape special characters if unquoting',
  processCss('h1{font-family:"Ahem!"}', 'h1{font-family:Ahem\\!}')
);

test(
  'should not escape multiple special characters',
  processCss.passthrough('h1{font-family:"Ahem!!"}')
);

test(
  'should not mangle legal unquoted values',
  processCss.passthrough('h1{font-family:\\$42}')
);

test(
  'should not mangle font names',
  processCss.passthrough('h1{font-family:Glyphicons Halflings}')
);
