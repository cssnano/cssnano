'use strict';
const { test } = require('uvu');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');

const plugin = require('../src/index.js');

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

const directions = ['top', 'right', 'bottom', 'left', 'center'];
const horizontal = {
  right: '100%',
  left: '0',
};

const vertical = {
  bottom: '100%',
  top: '0',
};

const hkeys = Object.keys(horizontal);
const vkeys = Object.keys(vertical);

function suite(property, additional = '', tail = '') {
  const tests = [];
  const push = (...examples) => {
    examples.forEach(({ fixture, expected }) => {
      tests.push(
        processCSS(
          `${property}${additional}${fixture}${tail}`,
          `${property}${additional}${expected}${tail}`
        ),
        processCSS(
          `${property}${additional}${fixture}${tail},${fixture}${tail}`,
          `${property}${additional}${expected}${tail},${expected}${tail}`
        )
      );
    });
  };

  if (property === 'background:') {
    push({
      message:
        'should convert <percentage> center/50% 50% to <percentage>/50% 50%',
      fixture: '30% center/50% 50%',
      expected: '30%/50% 50%',
    });
  }

  push(
    {
      message: 'should convert <percentage> center to <percentage>',
      fixture: `30% center`,
      expected: `30%`,
    },
    {
      message: 'should not convert <percentage> <percentage>',
      fixture: `45% 60%`,
      expected: `45% 60%`,
    }
  );

  directions.forEach((direction) => {
    let conversion = horizontal[direction] || direction;

    if (direction === 'center') {
      conversion = '50%';
    }

    if (
      direction === 'right' ||
      direction === 'left' ||
      direction === 'center'
    ) {
      push({
        message: `should convert "${direction}" to "${conversion}"`,
        fixture: `${direction}`,
        expected: `${conversion}`,
      });
    }

    push({
      message: `should convert "${direction} center" to "${conversion}"`,
      fixture: `${direction} center`,
      expected: `${conversion}`,
    });

    if (direction === 'center') {
      return;
    }

    push({
      message: `should convert "center ${direction}" to "${conversion}"`,
      fixture: `center ${direction}`,
      expected: `${conversion}`,
    });

    directions
      .slice(0, -1)
      .filter((d) => {
        if (
          d === direction ||
          (hkeys.includes(d) && hkeys.includes(direction)) ||
          (vkeys.includes(d) && vkeys.includes(direction))
        ) {
          return false;
        }

        return true;
      })
      .forEach((other) => {
        let result;

        if (Object.keys(horizontal).includes(direction)) {
          result = horizontal[direction] + ' ' + vertical[other];
        } else {
          result = horizontal[other] + ' ' + vertical[direction];
        }

        push(
          {
            message: `should convert "${direction} ${other}" to "${result}"`,
            fixture: `${direction} ${other}`,
            expected: `${result}`,
          },
          {
            message: `should not convert the three value syntax "${direction} ${other} 60px"`,
            fixture: `${direction} ${other} 60px`,
            expected: `${direction} ${other} 60px`,
          }
        );

        if (property === 'background:') {
          push({
            message: `should convert "${direction} ${other}"/50% 50% to "${result}/50% 50%"`,
            fixture: `${direction} ${other}/50% 50%`,
            expected: `${result}/50% 50%`,
          });
        }
      });
  });

  return () => Promise.all(tests);
}

test(
  'background:',
  suite(
    'background:',
    'url(http://example.com/testing/test.png) no-repeat ',
    ' #f1ff'
  )
);

test('background-position:', suite('background-position:'));

test('background: #1', suite('background:', '#000 url(cat.jpg) '));

test('perspective-origin:', suite('perspective-origin:'));

test('-webkit-perspective-origin:', suite('-webkit-perspective-origin:'));

test(
  'should pass through when there are no position values',
  passthroughCSS('background:url(cat.jpg)')
);

test(
  'should pass through with calc function',
  passthroughCSS('background-position: center right calc(0.375em + 0.1875rem)')
);

test(
  'should pass through with calc function (uppercase)',
  passthroughCSS('background-position: center right CALC(0.375em + 0.1875rem)')
);

test(
  'should pass through with min function',
  passthroughCSS(
    'background-position: center right min(10 * (1vw + 1vh) / 2, 12px)'
  )
);

test(
  'should pass through with max function',
  passthroughCSS(
    'background-position: center right max(10 * (1vw + 1vh) / 2, 12px)'
  )
);

test(
  'should pass through with clamp function',
  passthroughCSS(
    'background-position: center right clamp(12px, 10 * (1vw + 1vh) / 2, 100px)'
  )
);

test(
  'should pass through with var',
  passthroughCSS('background-position: var(--foo)')
);

test(
  'should pass through with var #1',
  passthroughCSS('background-position: center var(--foo)')
);

test(
  'should pass through with var #2',
  passthroughCSS('background-position: right 100px var(--test)')
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
  'should normalize when property in uppercase',
  processCSS('BACKGROUND-POSITION: center', 'BACKGROUND-POSITION: 50%')
);

test(
  'should normalize when value in uppercase',
  processCSS('BACKGROUND-POSITION: CENTER', 'BACKGROUND-POSITION: 50%')
);

test(
  'should normalize when value in uppercase (2)',
  processCSS(
    'BACKGROUND-POSITION: CENTER, CENTER',
    'BACKGROUND-POSITION: 50%, 50%'
  )
);

test(
  'should normalize when value in uppercase (3)',
  processCSS(
    'BACKGROUND-POSITION: LEFT BOTTOM, LEFT BOTTOM',
    'BACKGROUND-POSITION: 0 100%, 0 100%'
  )
);

test(
  'should normalize when value in uppercase (4)',
  processCSS(
    'BACKGROUND-POSITION: BOTTOM LEFT, BOTTOM LEFT',
    'BACKGROUND-POSITION: 0 100%, 0 100%'
  )
);

test(
  'should normalize when value in uppercase (5)',
  processCSS(
    'BACKGROUND-POSITION: CENTER LEFT, CENTER LEFT',
    'BACKGROUND-POSITION: 0, 0'
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
  'should handle 0 in background positions',
  passthroughCSS(
    'background-position: url("../../media/examples/star.png") 0 0 repeat-x'
  )
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));
test.run();
