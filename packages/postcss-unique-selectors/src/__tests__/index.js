import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../../util/testHelpers';
import plugin from '..';

const { processCSS } = processCSSFactory(plugin);

test(
  'should deduplicate selectors',
  processCSS('h1,h1,h1,h1{color:red}', 'h1{color:red}')
);

test(
  'should natural sort selectors',
  processCSS('h1,h10,H2,h7{color:red}', 'h1,H2,h7,h10{color:red}')
);

test(
  'should leave out comments in the selector',
  processCSS(
    '.newbackbtn,/*.searchall,*/.calNav{padding:5px;}',
    '.calNav,.newbackbtn{padding:5px;}'
  )
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
