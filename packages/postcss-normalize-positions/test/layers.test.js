import { test } from 'node:test';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should preserve an arbitrary coordinate before center',
  processCSS('background-position:95% center', 'background-position:95%')
);

test(
  'should preserve a length coordinate before center',
  processCSS('background-position:10px center', 'background-position:10px')
);

test(
  'should preserve a math coordinate before center',
  processCSS(
    'background-position:calc(100% - 5px) center',
    'background-position:calc(100% - 5px)'
  )
);

test(
  'should keep a math function with a nested function whole before center',
  processCSS(
    'background-position:calc(100% - max(1px, 2px)) center',
    'background-position:calc(100% - max(1px, 2px))'
  )
);

test(
  'should keep a math function whole before a background size separator',
  processCSS(
    'background:CALC(1px) CENTER / cover',
    'background:CALC(1px) / cover'
  )
);

test(
  'should not drop center from an invalid three-term position that starts with a math function',
  passthroughCSS('background-position:round(10px, 1px) center top')
);

test(
  'should compact whitespace before the background size separator after a keyword',
  processCSS('background:left center  / cover', 'background:0 / cover')
);

test(
  'should preserve center before a math function because it fixes the horizontal axis',
  passthroughCSS('background-position:center calc(1px)')
);

test(
  'should not treat a keyword inside parentheses as a position term',
  passthroughCSS('background-position:center (center) center')
);

test(
  'should leave a value with an unmatched closing parenthesis unchanged',
  passthroughCSS('background-position:center center )')
);

test(
  'should compact whitespace before the background size separator',
  processCSS(
    'background:calc(100% - 5px) center  / cover',
    'background:calc(100% - 5px) / cover'
  )
);

test(
  'should normalize position in multiple background layers',
  processCSS(
    'background:url(a.png) 95% center/cover no-repeat,linear-gradient(red,blue) 10px center/50% 50%',
    'background:url(a.png) 95%/cover no-repeat,linear-gradient(red,blue) 10px/50% 50%'
  )
);

test(
  'should normalize with background size',
  processCSS(
    'background: url(/media/examples/hand.jpg) center center / 200px 100px',
    'background: url(/media/examples/hand.jpg) 50% / 200px 100px'
  )
);

test(
  'should normalize with background size and right alignment',
  processCSS(
    'background: url(/media/examples/hand.jpg) right center / 200px 100px',
    'background: url(/media/examples/hand.jpg) 100% / 200px 100px'
  )
);

test(
  'should preserve arbitrary horizontal values before center',
  processCSS('background: 95% center', 'background: 95%')
);

test(
  'should normalize with multiple background positions',
  processCSS(
    'background: url("/media/examples/lizard.png") center center no-repeat, url("/media/examples/lizard.png") center center no-repeat',
    'background: url("/media/examples/lizard.png") 50% no-repeat, url("/media/examples/lizard.png") 50% no-repeat'
  )
);

test(
  'should normalize background position with var and multiple background',
  processCSS(
    'background: url("/media/examples/lizard.png") center center no-repeat, url("/media/examples/lizard.png") var(--foo)',
    'background: url("/media/examples/lizard.png") 50% no-repeat, url("/media/examples/lizard.png") var(--foo)'
  )
);

test(
  'should normalize background position with var and multiple background #1',
  processCSS(
    'background: url("/media/examples/lizard.png") var(--foo), url("/media/examples/lizard.png") center center no-repeat',
    'background: url("/media/examples/lizard.png") var(--foo), url("/media/examples/lizard.png") 50% no-repeat'
  )
);

test(
  'should normalize background position with var and multiple background #2',
  processCSS(
    'background: url("/media/examples/lizard.png") center center no-repeat, url("/media/examples/lizard.png") center var(--foo)',
    'background: url("/media/examples/lizard.png") 50% no-repeat, url("/media/examples/lizard.png") center var(--foo)'
  )
);

test(
  'should normalize background position with var and multiple background #3',
  processCSS(
    'background: url("/media/examples/lizard.png") center var(--foo), url("/media/examples/lizard.png") center center no-repeat',
    'background: url("/media/examples/lizard.png") center var(--foo), url("/media/examples/lizard.png") 50% no-repeat'
  )
);

test(
  'should preserve a vertical keyword and center split by a repeat style',
  passthroughCSS('background:top no-repeat center')
);

test(
  'should preserve a horizontal keyword and center split by a repeat style',
  passthroughCSS('background:left no-repeat center')
);

test(
  'should preserve center and a horizontal keyword split by a repeat style',
  passthroughCSS('background:center repeat-x left')
);

test(
  'should preserve a keyword pair split by a repeat style',
  passthroughCSS('background:left no-repeat top')
);

test(
  'should preserve a coordinate and center split by a repeat style',
  passthroughCSS('background:10px no-repeat center')
);

test(
  'should keep the vertical keyword spelling when dropping center',
  processCSS('background-position:CENTER TOP', 'background-position:TOP')
);

test(
  'should drop center before a vertical keyword followed by a background size',
  processCSS(
    'background:url(a.png) center bottom/cover',
    'background:url(a.png) bottom/cover'
  )
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
