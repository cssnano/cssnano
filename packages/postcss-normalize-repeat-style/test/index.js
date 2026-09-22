import { test } from 'node:test';
import {
  usePostCSSPlugin,
  processCSSFactory,
} from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should pass through two value syntax',
  passthroughCSS('background:space round')
);

test(
  'should normalize keywords with comments and unusual whitespace',
  processCSS(
    'background-repeat:repeat/* between */\tno-repeat',
    'background-repeat:repeat-x'
  )
);

test(
  'should normalize keywords separated by a comment containing markers',
  processCSS(
    `background-repeat:repeat/*${'*//*'.repeat(2000)}*/no-repeat`,
    'background-repeat:repeat-x'
  )
);

test(
  'should preserve other component values between comment-wrapped keywords',
  passthroughCSS('background:repeat/* a */red/* b */no-repeat')
);

test(
  'should preserve other component values between keywords',
  passthroughCSS('background:repeat red no-repeat')
);

test(
  'should preserve lengths between keywords',
  passthroughCSS('background:repeat 50% no-repeat')
);

test(
  'should preserve keywords separated by a bare size separator',
  passthroughCSS('background:repeat / no-repeat')
);

test(
  'should preserve functions between keywords',
  passthroughCSS('background:repeat image("cat.png") no-repeat')
);

test(
  'should normalize only the layer without intervening component values',
  processCSS(
    'background:repeat red no-repeat, repeat no-repeat',
    'background:repeat red no-repeat, repeat-x'
  )
);

test(
  'should drop important comments inside a normalized keyword gap',
  processCSS(
    'background-repeat:repeat /*! keep */ no-repeat',
    'background-repeat:repeat-x'
  )
);

test(
  'should normalize keywords separated by multiple comments',
  processCSS(
    'background-repeat:repeat/* a *//* b */no-repeat',
    'background-repeat:repeat-x'
  )
);

test(
  'should preserve repeat syntax after a size separator',
  passthroughCSS('background:repeat no-repeat/cover')
);

test(
  'should not inspect escaped variable functions',
  passthroughCSS('background-repeat:v\\61r(--repeat, repeat no-repeat)')
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

for (const conversion of [
  { input: 'repeat no-repeat', minified: 'repeat-x' },
  { input: 'no-repeat repeat', minified: 'repeat-y' },
  { input: 'repeat repeat', minified: 'repeat' },
  { input: 'space space', minified: 'space' },
  { input: 'round round', minified: 'round' },
  { input: 'no-repeat no-repeat', minified: 'no-repeat' },
]) {
  const { input, minified } = conversion;

  test(`should convert ${input} to ${minified}`, suite(input, minified));
}

test(
  'should normalize uppercase property and value',
  processCSS(
    'BACKGROUND:#000 url(cat.jpg) REPEAT NO-REPEAT 50%',
    'BACKGROUND:#000 url(cat.jpg) repeat-x 50%'
  )
);

test(
  'should normalize mixed-case ASCII repeat properties and values',
  processCSS('MaSk-RePeAt:RePeAt No-RePeAt', 'MaSk-RePeAt:repeat-x')
);

test(
  'should not match a Unicode lookalike repeat property',
  passthroughCSS('maſk-repeat:repeat no-repeat')
);

test(
  'should not treat non-CSS whitespace as a repeat separator',
  passthroughCSS('background-repeat:repeat\u00a0no-repeat')
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
  'should pass through with constant',
  passthroughCSS('background-position: constant(--foo)')
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

test(
  'should normalize multiple layers around untouched layers',
  processCSS(
    'background: repeat no-repeat, repeat red no-repeat, no-repeat repeat',
    'background: repeat-x, repeat red no-repeat, repeat-y'
  )
);

test(
  'should preserve comments outside the keyword boundaries',
  processCSS(
    'background: /*! start */ repeat no-repeat /*! end */',
    'background: /*! start */ repeat-x /*! end */'
  )
);

test(
  'should pass through more than two repeat keywords',
  passthroughCSS('background: repeat repeat repeat')
);

test(
  'should normalize escaped repeat keywords',
  processCSS('background: \\72 epeat no-repeat', 'background: repeat-x')
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
