import { test } from 'node:test';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

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

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
