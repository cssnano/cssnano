import mappings from '../lib/map';
import plugin from '..';
import getData from '../../../../util/getData';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../../util/testHelpers';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);
const data = getData(mappings);

test(
  'should pass through two value syntax',
  passthroughCSS('background:space round')
);

function suite(fixture, expected) {
  return () =>
    Promise.all([
      processCSS(
        `background:#000 url(cat.jpg) ${fixture} 50%`,
        `background:#000 url(cat.jpg) ${expected} 50%`
      ),
      processCSS(
        `background-repeat:${fixture}`,
        `background-repeat:${expected}`
      ),
      processCSS(
        `background-repeat:#000 url(cat.jpg) ${fixture} 50%,#000 url(cat.jpg) ${fixture} 50%`,
        `background-repeat:#000 url(cat.jpg) ${expected} 50%,#000 url(cat.jpg) ${expected} 50%`
      ),
      processCSS(
        `background-repeat:${fixture},${fixture}`,
        `background-repeat:${expected},${expected}`
      ),
      processCSS(`mask-repeat:${fixture}`, `mask-repeat:${expected}`),
    ]);
}

Object.keys(data).forEach((conversion) => {
  const fixture = data[conversion];

  test(fixture, suite(fixture, conversion));
});

test(
  'should normalize uppercase property and value',
  processCSS(
    'BACKGROUND:#000 url(cat.jpg) REPEAT NO-REPEAT 50%',
    'BACKGROUND:#000 url(cat.jpg) repeat-x 50%'
  )
);

test(
  'should pass through when there are no repeat values',
  passthroughCSS('background:url(cat.jpg)')
);

test(
  'should pass through when there are no repeat values (2)',
  passthroughCSS('background:#000 url(cat.jpg)')
);

test(
  'should pass through the single value syntax',
  passthroughCSS('background:#000 url(cat.jpg) repeat')
);

test(
  'should pass through with var',
  passthroughCSS('background-repeat: var(--foo)')
);

test(
  'should pass through with var #1',
  passthroughCSS('background-repeat: center var(--foo)')
);

test(
  'should pass through with var #2',
  passthroughCSS('background-repeat: right 100px var(--test)')
);

test(
  'should pass through with var #3',
  passthroughCSS('background: var(--foo)')
);

test(
  'should pass through with var #4',
  passthroughCSS(
    'background: url("../../media/examples/star.png") center var(--foo);'
  )
);

test(
  'should pass through with env',
  passthroughCSS('background-position: env(--foo)')
);

test(
  'should normalize background position with var and multiple background',
  processCSS(
    'background: url("/media/examples/lizard.png") repeat no-repeat, url("/media/examples/lizard.png") var(--foo)',
    'background: url("/media/examples/lizard.png") repeat-x, url("/media/examples/lizard.png") var(--foo)'
  )
);

test(
  'should normalize background position with var and multiple background #1',
  processCSS(
    'background: url("/media/examples/lizard.png") var(--foo), url("/media/examples/lizard.png") repeat no-repeat',
    'background: url("/media/examples/lizard.png") var(--foo), url("/media/examples/lizard.png") repeat-x'
  )
);

test(
  'should normalize background position with var and multiple background #2',
  processCSS(
    'background: url("/media/examples/lizard.png") repeat no-repeat, url("/media/examples/lizard.png") repeat var(--foo)',
    'background: url("/media/examples/lizard.png") repeat-x, url("/media/examples/lizard.png") repeat var(--foo)'
  )
);

test(
  'should normalize background position with var and multiple background #3',
  processCSS(
    'background: url("/media/examples/lizard.png") repeat var(--foo), url("/media/examples/lizard.png") repeat no-repeat',
    'background: url("/media/examples/lizard.png") repeat var(--foo), url("/media/examples/lizard.png") repeat-x'
  )
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
