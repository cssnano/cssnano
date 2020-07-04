import { processCSSFactory } from '../../../../util/testHelpers';
import plugin from '..';

const { processCSS } = processCSSFactory(plugin);

process.env.BROWSERSLIST = 'IE 11';

test(
  'should remove whitespace between the atrule and param ',
  processCSS('@media ()', '@media()')
);

test(
  'should remove whitespace between the atrule and param #2',
  processCSS('@supports ( display: grid ) {}', '@supports(display:grid){}')
);

test(
  'should remove whitespace between the atrule and param #3',
  processCSS(
    '@media screen    and (color), projection and (max-width:500px){}',
    '@media screen and(color),projection and(max-width:500px){}'
  )
);
