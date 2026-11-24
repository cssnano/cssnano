import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import preset from '#presets/default';
import {
  processCSSFactory,
  testTargets,
  withTargets,
} from '../../../../../util/testHelpers.js';
import { onlyTransform } from '../onlyTransform.js';

const plugin = onlyTransform(['mergeLonghand']);
const { processCSS, passthroughCSS } = processCSSFactory(plugin);

/** @param {string} body @param {string} expected */
const drops = (body, expected) => processCSS(`a{${body}}`, `a{${expected}}`);

/** @param {string} body */
const keeps = (body) => passthroughCSS(`a{${body}}`);

test(
  'background-color equal to the shorthand colour is dropped',
  drops('background:#fff;background-color:#fff', 'background:#fff')
);
test(
  'background-image none is dropped after a shorthand that sets no image',
  drops('background:red;background-image:none', 'background:red')
);
test(
  'background-repeat initial is dropped after a shorthand that omits the repeat',
  drops('background:red;background-repeat:initial', 'background:red')
);
test(
  'background-color transparent is dropped after a shorthand that omits the colour',
  drops(
    'background:no-repeat;background-color:transparent',
    'background:no-repeat'
  )
);
test(
  'background-color differing only in ASCII case is dropped',
  drops('background:#FFF;background-color:#fff', 'background:#FFF')
);
test(
  'background-color #0000 is dropped after a transparent shorthand colour',
  drops(
    'background:transparent;background-color:#0000',
    'background:transparent'
  )
);
test(
  'background-color that differs from the shorthand colour is kept',
  keeps('background:red;background-color:blue')
);
test(
  'background-color initial is kept when the shorthand sets a colour',
  keeps('background:red;background-color:initial')
);
test(
  'background-color is kept when the shorthand has a different importance',
  keeps('background:red !important;background-color:red')
);
test(
  'background-color is kept when only the shorthand is marked important',
  keeps('background:red;background-color:red !important')
);
test(
  'a multi-layer shorthand keeps its later background-image longhand',
  keeps('background:url(a.png),url(b.png);background-image:none')
);
test(
  'a shorthand with var() keeps its later longhand, whose value is unknown',
  keeps('background:var(--c);background-color:transparent')
);
test(
  'background-blend-mode is kept: the shorthand does not reset it',
  keeps('background:red;background-blend-mode:normal')
);
test(
  'background-position-x is kept: the shorthand does not set it on its own',
  keeps('background:red;background-position-x:0')
);
test(
  'a gradient longhand that differs from the shorthand image is kept',
  keeps('background:#ccc;background-image:linear-gradient(top,#fff,#000)')
);
test(
  'a prefixed size alias between the shorthand and a size longhand keeps the longhand',
  keeps(
    'background:no-repeat;-webkit-background-size:10px;background-size:initial'
  )
);
test(
  'a longhand is kept after a shorthand some target ignores, which then sets nothing',
  keeps('background:#ff000080;background-image:none')
);
test(
  'a longhand is kept after a space-separated rgb() shorthand, which IE 11 ignores',
  keeps('background:rgb(0 0 0);background-image:none')
);
test(
  'a longhand is kept after a rebeccapurple shorthand, which IE 11 ignores',
  keeps('background:rebeccapurple;background-image:none')
);
test(
  'background-color is kept after a url() with a colour written right after it, which the shorthand sets',
  keeps('background:url(a)red;background-color:transparent')
);
test(
  'background-repeat is kept after a quoted url() with a repeat written right after it, which the shorthand sets',
  keeps('background:url("a")no-repeat;background-repeat:repeat')
);
test(
  'background-image equal to a quoted url() shorthand image is dropped',
  drops(
    'background:url("a b");background-image:url("a b")',
    'background:url("a b")'
  )
);
test(
  'background-image equal to the first layer is kept, since it removes the other layers',
  keeps('background:none,url(b.png);background-image:none')
);
test(
  'a longhand is kept after a shorthand with two images, which browsers ignore as invalid',
  keeps('background:url(a.png) none;background-image:none')
);
test(
  'a longhand equal to the shorthand is kept after a longhand that changed it',
  keeps('background:red;background-image:url(x);background-image:none')
);
test(
  'background-clip is kept when it differs from the second box keyword, which sets the clip',
  keeps('background:padding-box content-box;background-clip:padding-box')
);
test(
  'background-clip equal to the second box keyword is dropped',
  drops(
    'background:padding-box content-box;background-clip:content-box',
    'background:padding-box content-box'
  )
);
test(
  'a longhand is kept after a star-hack shorthand, which only old IE applies',
  keeps('*background:red;background-image:none')
);
test(
  'a longhand is kept after an escaped background-image that changed the image',
  keeps('background:red;b\\61 ckground-image:url(x);background-image:none')
);
test(
  'a longhand is kept after an escaped background shorthand that reset the image',
  keeps('background:red;b\\61 ckground:url(x);background-image:none')
);
test(
  'a longhand is kept after a shorthand in another run of declarations',
  keeps('background:red;&{color:blue}background-image:none')
);
test(
  'a longhand is kept after a system-colour shorthand, whose support varies',
  keeps('background:canvas;background-image:none')
);

test('a longhand is kept for IE 8, which ignores a shorthand with CSS 3 keywords', async () => {
  const css = 'a{background:red padding-box;background-image:none}';
  const result = await postcss([plugin(withTargets('ie 8'))]).process(css, {
    from: undefined,
  });
  assert.equal(result.css, css);
});

test('transparent background pair keeps only the shorthand in the default preset', async () => {
  const css = 'a{background:transparent;background-color:transparent}';
  const result = await postcss(
    preset({ browserslist: { query: testTargets } })
  ).process(css, {
    from: undefined,
  });
  assert.equal(result.css, 'a{background:transparent}');
});
