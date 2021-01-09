import { processCSSFactory } from '../../../../util/testHelpers';
import plugin from '..';

const { processCSS } = processCSSFactory(plugin);

process.env.BROWSERSLIST = 'chrome 80';

test(
  'should merge pseudo which are supported by the browsers - read-write',
  processCSS(
    'p:read-write  { color: orange; } p:read-write  {  border: 1px solid blue;}',
    'p:read-write  { color: orange;  border: 1px solid blue; }'
  )
);

test(
  'should  merge pseudo which are  supported by the browsers - read-only',
  processCSS(
    'p:read-only  { color: orange; } p:read-only  {  border: 1px solid blue;}',
    'p:read-only  { color: orange;  border: 1px solid blue; }'
  )
);
