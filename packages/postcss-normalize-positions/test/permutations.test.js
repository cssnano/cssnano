import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS } = processCSSFactory(plugin);

test(
  'background-position: right',
  processCSS('background-position:right', 'background-position:100%')
);
test(
  'background-position: left',
  processCSS('background-position:left', 'background-position:0')
);
test(
  'background-position: center',
  processCSS('background-position:center', 'background-position:50%')
);
test(
  'background-position: top',
  processCSS('background-position:top', 'background-position:top')
);
test(
  'background-position: bottom',
  processCSS('background-position:bottom', 'background-position:bottom')
);

test(
  'background-position: right center',
  processCSS('background-position:right center', 'background-position:100%')
);
test(
  'background-position: center right',
  processCSS('background-position:center right', 'background-position:100%')
);
test(
  'background-position: left center',
  processCSS('background-position:left center', 'background-position:0')
);
test(
  'background-position: center left',
  processCSS('background-position:center left', 'background-position:0')
);
test(
  'background-position: center center',
  processCSS('background-position:center center', 'background-position:50%')
);
test(
  'background-position: top center',
  processCSS('background-position:top center', 'background-position:0')
);
test(
  'background-position: center top',
  processCSS('background-position:center top', 'background-position:center top')
);
test(
  'background-position: bottom center',
  processCSS('background-position:bottom center', 'background-position:100%')
);
test(
  'background-position: center bottom',
  processCSS(
    'background-position:center bottom',
    'background-position:center bottom'
  )
);

test(
  'background-position: left top',
  processCSS('background-position:left top', 'background-position:0 0')
);
test(
  'background-position: top left',
  processCSS('background-position:top left', 'background-position:0 0')
);
test(
  'background-position: right top',
  processCSS('background-position:right top', 'background-position:100% 0')
);
test(
  'background-position: top right',
  processCSS('background-position:top right', 'background-position:100% 0')
);
test(
  'background-position: left bottom',
  processCSS('background-position:left bottom', 'background-position:0 100%')
);
test(
  'background-position: bottom left',
  processCSS('background-position:bottom left', 'background-position:0 100%')
);
test(
  'background-position: right bottom',
  processCSS(
    'background-position:right bottom',
    'background-position:100% 100%'
  )
);
test(
  'background-position: bottom right',
  processCSS(
    'background-position:bottom right',
    'background-position:100% 100%'
  )
);

test(
  'background-position: 30% center',
  processCSS('background-position:30% center', 'background-position:30%')
);
test(
  'background-position: 45% 60%',
  processCSS('background-position:45% 60%', 'background-position:45% 60%')
);

test(
  'background-position: left top 60px',
  processCSS(
    'background-position:left top 60px',
    'background-position:left top 60px'
  )
);
test(
  'background-position: right bottom 60px',
  processCSS(
    'background-position:right bottom 60px',
    'background-position:right bottom 60px'
  )
);

test(
  'background: right center with url',
  processCSS(
    'background:url(cat.jpg) right center',
    'background:url(cat.jpg) 100%'
  )
);
test(
  'background: 30% center/50% 50%',
  processCSS(
    'background:url(test.png) 30% center/50% 50% no-repeat #f1ff',
    'background:url(test.png) 30%/50% 50% no-repeat #f1ff'
  )
);
test(
  'background: right top/50% 50%',
  processCSS('background:right top/50% 50%', 'background:100% 0/50% 50%')
);

test(
  'perspective-origin: right center',
  processCSS('perspective-origin:right center', 'perspective-origin:100%')
);
test(
  'perspective-origin: left top',
  processCSS('perspective-origin:left top', 'perspective-origin:0 0')
);
test(
  '-webkit-perspective-origin: right center',
  processCSS(
    '-webkit-perspective-origin:right center',
    '-webkit-perspective-origin:100%'
  )
);
test(
  '-webkit-perspective-origin: left top',
  processCSS(
    '-webkit-perspective-origin:left top',
    '-webkit-perspective-origin:0 0'
  )
);

test(
  'multiple positions: right center, left top',
  processCSS(
    'background-position:right center, left top',
    'background-position:100%, 0 0'
  )
);
