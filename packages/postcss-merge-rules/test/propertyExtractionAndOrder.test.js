import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should merge text-* properties',
  processCSS(
    'h1{color:red;text-align:right;text-decoration:underline}h2{text-align:right;text-decoration:underline}',
    'h1{color:red}h1,h2{text-align:right;text-decoration:underline}'
  )
);

test(
  'should merge text-* properties (2)',
  processCSS(
    'h1{color:red;text-align:right;text-decoration:underline}h2{text-align:right;text-decoration:underline;color:green}',
    'h1{color:red}h1,h2{text-align:right;text-decoration:underline}h2{color:green}'
  )
);

test(
  'should merge text-* properties (3)',
  processCSS(
    'h1{background:white;color:red;text-align:right;text-decoration:underline}h2{text-align:right;text-decoration:underline;color:red}',
    'h1{background:white}h1,h2{color:red;text-align:right;text-decoration:underline}'
  )
);

test(
  'should merge text-* properties (4)',
  processCSS(
    'h1{color:red;text-align:center;text-transform:small-caps}h2{text-align:center;color:red}',
    'h1{text-transform:small-caps}h1,h2{color:red;text-align:center}'
  )
);

test(
  'should merge text-* properties (5)',
  processCSS(
    'h1{text-align:left;text-transform:small-caps}h2{text-align:right;text-transform:small-caps}',
    'h1{text-align:left}h1,h2{text-transform:small-caps}h2{text-align:right}'
  )
);

test(
  'should not incorrectly extract transform properties',
  passthroughCSS(
    '@keyframes a {0%{transform-origin:right bottom;transform:rotate(-90deg);opacity:0}100%{transform-origin:right bottom;transform:rotate(0);opacity:1}}'
  )
);

test(
  'should not incorrectly extract background properties',
  passthroughCSS(
    '.iPhone{background:url(a.png);background-image:url(../../../sprites/c.png);background-repeat:no-repeat;background-position:-102px -74px}.logo{background:url(b.png);background-image:url(../../../sprites/c.png);background-repeat:no-repeat;background-position:-2px -146px}'
  )
);

test(
  'should not incorrectly extract margin properties',
  passthroughCSS('h2{margin-bottom:20px}h1{margin:10px;margin-bottom:20px}')
);

test(
  'should not incorrectly extract margin properties (2)',
  processCSS(
    'h2{color:red;margin-bottom:20px}h1{color:red;margin:10px;margin-bottom:20px}',
    'h2{margin-bottom:20px}h2,h1{color:red}h1{margin:10px;margin-bottom:20px}'
  )
);

test(
  'should not incorrectly extract margin properties (3)',
  passthroughCSS('h2{margin:0;margin-bottom:20px}h1{margin:0;margin-top:20px}')
);

test(
  'should not incorrectly extract margin properties (4)',
  passthroughCSS('h2{margin:0}h1{margin-top:20px;margin:0}')
);

test(
  'should not incorrectly extract border properties',
  passthroughCSS(
    '.a{border-top: 10px solid blue; border-width: 1px;} .b {border-left: 10px solid blue; border-width: 1px;}'
  )
);

test(
  'should not incorrectly extract flex properties',
  processCSS(
    '.a { place-content: center; justify-content: start; } .b { justify-content: start; place-content: center; }',
    '.a { place-content: center; } .a,.b { justify-content: start; } .b { place-content: center; }'
  )
);

test(
  'should not incorrectly extract display properties',
  passthroughCSS(
    '.box1{display:inline-block;display:block}.box2{display:inline-block}'
  )
);

test(
  'should not merge conflicting rules',
  passthroughCSS(
    '.a{font-family:Arial;font-family:Helvetica;}.b{font-family:Arial;}'
  )
);

test(
  'should respect property order and do nothing',
  passthroughCSS(
    'body { overflow: hidden; overflow-y: scroll; overflow-x: hidden;} main { overflow: hidden }'
  )
);

// `border-color` has to stay put in both rules, since the `border-bottom-color`
// that follows it differs between them. `border-bottom-style` is a different
// longhand, so nothing here overrides it and it can be hoisted on its own.
test(
  'should respect property order (2)',
  processCSS(
    '.a{ border-color:transparent; border-bottom-color:#111111; border-bottom-style:solid; }.b{ border-color:transparent; border-bottom-color:#222222; border-bottom-style:solid; }',
    '.a{ border-color:transparent; border-bottom-color:#111111; }.a,.b{ border-bottom-style:solid; }.b{ border-color:transparent; border-bottom-color:#222222; }'
  )
);

test(
  'should respect property order and do nothing (3)',
  processCSS(
    '.fb-col-md-6 { color: red; border-color:blue; flex: 0 0 auto; flex-basis: 50%; } .fb-col-md-7 { color: red; border-color:blue; flex: 0 0 auto; flex-basis: 58.3%; }',
    '.fb-col-md-6 { flex: 0 0 auto; flex-basis: 50%; } .fb-col-md-6,.fb-col-md-7 { color: red; border-color:blue; } .fb-col-md-7 { flex: 0 0 auto; flex-basis: 58.3%; }'
  )
);

test(
  'should respect property order and do nothing (4) (cssnano#160)',
  passthroughCSS(
    'one { border: 1px solid black; border-top: none; } two { border: 1px solid black; }'
  )
);

test(
  'should respect property order and do nothing (5) (cssnano#87)',
  passthroughCSS(
    '.dispendium-theme.fr-toolbar.fr-top { border-radius: 0; background-clip: padding-box; box-shadow: none; border: 1px solid #E0E0E0; border-bottom: 0; } .dispendium-theme.fr-toolbar.fr-bottom { border-radius: 0; background-clip: padding-box; box-shadow: none; border: 1px solid #E0E0E0; border-top: 0; }'
  )
);

test(
  'should respect property order and do nothing (6) (issue #19)',
  passthroughCSS(
    ".share .comment-count:before { content: ' '; position: absolute; width: 0; height: 0; right: 7px; top: 26px; border: 5px solid; border-color: #326891 #326891 transparent transparent; } .share .comment-count:after { content: ' '; position: absolute; width: 0; height: 0; right: 8px; top: 24px; border: 5px solid; border-color: #fff #fff transparent transparent; }"
  )
);
