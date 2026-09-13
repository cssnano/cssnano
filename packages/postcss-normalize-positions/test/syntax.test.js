import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

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
  'should preserve comments in an unnormalized position range',
  passthroughCSS('background-position:95% /* source comment */ 60%')
);

test(
  'should refuse three and four coordinate syntax',
  passthroughCSS(
    'background-position:left 10px top 20px,left 10px top 20px 1px'
  )
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
  'should handle 0 in background positions',
  passthroughCSS(
    'background-position: url("../../media/examples/star.png") 0 0 repeat-x'
  )
);
