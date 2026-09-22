import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'does not classify animation keyword functions as keywords',
  processCSS(
    'a{animation:reverse() bounce 1s running() infinite() ease()}',
    'a{animation:reverse() bounce running() infinite() ease() 1s}'
  )
);

test(
  'preserves animation with trailing operators outside calc',
  passthroughCSS('a{animation:infinite calc(1s)*2}')
);

test(
  'preserves animation with invalid single-argument dimension round()',
  passthroughCSS('a{animation:round(1s) fade ease 1s}')
);

test(
  'should pass through important comments (animation)',
  passthroughCSS(
    'animation: bounce /*!wow*/ 1s linear 2s 5 normal none running'
  )
);

describe('Order', () => {
  test(
    'should order animation consistently (1)',
    passthroughCSS('animation: bounce 1s linear 2s 3 normal none running')
  );

  test(
    'should order animation consistently (2)',
    processCSS(
      'animation: running none normal 3 1s 2s linear bounce',
      'animation: bounce 1s linear 2s 3 normal none running'
    )
  );

  test(
    'should order animation consistently (2) (uppercase property and value)',
    processCSS(
      'ANIMATION: RUNNING NONE NORMAL 3 1S 2S LINEAR BOUNCE',
      'ANIMATION: BOUNCE 1S LINEAR 2S 3 NORMAL NONE RUNNING'
    )
  );

  test(
    'should order animation consistently (3) (timing function keywords)',
    processCSS(
      'animation: ease-in-out 1s bounce',
      'animation: bounce 1s ease-in-out'
    )
  );

  test(
    'should order animation consistently (3) (steps timing function)',
    processCSS(
      'animation: steps(3, start) 1s bounce',
      'animation: bounce 1s steps(3, start)'
    )
  );

  test(
    'should order animation consistently (3) (cubic-bezier timing function)',
    processCSS(
      'animation: cubic-bezier(0, 0.3, 0.6, 1) 1s bounce',
      'animation: bounce 1s cubic-bezier(0, 0.3, 0.6, 1)'
    )
  );

  test(
    'should order animation consistently (3) (linear timing function)',
    processCSS(
      'animation: linear(0, 1) 1s bounce',
      'animation: bounce 1s linear(0, 1)'
    )
  );

  test(
    'should order animation consistently (3) (frames timing function)',
    processCSS(
      'animation: frames(3) 1s bounce',
      'animation: bounce 1s frames(3)'
    )
  );

  test(
    'should order animation consistently (4) (iteration count as number)',
    processCSS('animation: 3 1s bounce', 'animation: bounce 1s 3')
  );

  test(
    'should order animation consistently (4) (iteration count as infinite)',
    processCSS('animation: infinite 1s bounce', 'animation: bounce 1s infinite')
  );

  test(
    'should order animation consistently (5) (do not reorder times)',
    processCSS('animation: 1s 2s bounce', 'animation: bounce 1s 2s')
  );

  test(
    'should order animation consistently (5.1) (do not reorder times)',
    processCSS('animation: 1s bounce 2s', 'animation: bounce 1s 2s')
  );

  test(
    'should order animation consistently (6) (direction "normal")',
    processCSS('animation: normal 1s bounce', 'animation: bounce 1s normal')
  );

  test(
    'should order animation consistently (6) (direction "reverse")',
    processCSS('animation: reverse 1s bounce', 'animation: bounce 1s reverse')
  );

  test(
    'should order animation consistently (6) (direction "alternate")',
    processCSS(
      'animation: alternate 1s bounce',
      'animation: bounce 1s alternate'
    )
  );

  test(
    'should order animation consistently (6) (direction "alternate-reverse")',
    processCSS(
      'animation: alternate-reverse 1s bounce',
      'animation: bounce 1s alternate-reverse'
    )
  );

  test(
    'should order animation consistently (7) (fill mode "none")',
    processCSS('animation: none 1s bounce', 'animation: bounce 1s none')
  );

  test(
    'should order animation consistently (7) (fill mode "forwards")',
    processCSS('animation: forwards 1s bounce', 'animation: bounce 1s forwards')
  );

  test(
    'should order animation consistently (7) (fill mode "backwards")',
    processCSS(
      'animation: backwards 1s bounce',
      'animation: bounce 1s backwards'
    )
  );

  test(
    'should order animation consistently (7) (fill mode "both")',
    processCSS('animation: both 1s bounce', 'animation: bounce 1s both')
  );

  test(
    'should order animation consistently (8) (play state "running")',
    processCSS('animation: running 1s bounce', 'animation: bounce 1s running')
  );

  test(
    'should order animation consistently (8) (play state "paused")',
    processCSS('animation: paused 1s bounce', 'animation: bounce 1s paused')
  );

  test(
    'should order animation consistently (9) (assigns keyframe name last when it matches a keyword)',
    processCSS(
      'animation: none 1s linear 2s both',
      'animation: both 1s linear 2s none'
    )
  );

  test(
    'should order animation consistently (9.1) (assigns keyframe name last when it matches a keyword)',
    processCSS('animation: ease 1s linear', 'animation: linear 1s ease')
  );

  test(
    'should order animation with string keyframe names',
    processCSS(
      'a{animation: 1s "fade", 2s ease "bounce"}',
      'a{animation: "fade" 1s,"bounce" 2s ease}'
    )
  );

  test(
    'should pass through animation declarations with excess time values or multiple names',
    passthroughCSS('a{animation: 1s 2s 3s;animation: 1s foo bar}')
  );

  test(
    'should pass through animation declarations with string keyframe names or invalid terms',
    passthroughCSS(
      'a{animation: 1s "foo" "bar";animation: 1s foo "bar";animation: 1s 2 3;animation: 1s foo 10px}'
    )
  );

  test(
    'should pass through animation declarations with percentage or url keyframe names',
    passthroughCSS(
      'a{animation: 1s 50%;animation: 1s foo 50%;animation: 1s url(fade.svg)}'
    )
  );

  test(
    'should pass through animation declarations with structural tokens',
    passthroughCSS(
      'a{animation: 1s #foo ease;animation: 1s (foo) ease;animation: 1s [foo] ease;animation: 1s @foo ease}'
    )
  );

  test(
    'orders animation with negative math duration per CSS Values 4 range clamping',
    processCSS(
      'a{animation: calc(-1s) fade ease;animation: ease calc(-1s) fade}',
      'a{animation: fade calc(-1s) ease;animation: fade calc(-1s) ease}'
    )
  );

  test(
    'should order animation consistently (10) (handle multiple animation values)',
    processCSS(
      'animation: 1s 2s bounce linear, 8s 1s shake ease',
      'animation: bounce 1s linear 2s,shake 8s ease 1s'
    )
  );

  test(
    'should order animation consistently (10) (process prefixed -webkit-animation)',
    processCSS(
      '-webkit-animation: linear bounce 1s 2s',
      '-webkit-animation: bounce 1s linear 2s'
    )
  );

  test(
    'should order animation consistently (11) (process prefixed -moz-animation)',
    processCSS(
      '-moz-animation: linear bounce 1s 2s',
      '-moz-animation: bounce 1s linear 2s'
    )
  );
});

describe('Pass through', () => {
  test(
    'should abort ordering when a var is detected (animation)',
    passthroughCSS(
      'animation: bounce /*!wow*/ 1s var(--linear) 2s 5 normal none running'
    )
  );

  test(
    'should abort ordering when a var is detected (animation) (uppercase "var")',
    passthroughCSS(
      'animation: bounce /*!wow*/ 1s VAR(--linear) 2s 5 normal none running'
    )
  );
});
