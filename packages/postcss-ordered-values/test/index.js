'use strict';
const { test } = require('uvu');
const {
  usePostCSSPlugin,
  processCSSFactory,
} = require('../../../util/testHelpers.js');

const plugin = require('../src/index.js');

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should order border consistently',
  processCSS(
    'h1{border:1px solid red;border:1px red solid;border:solid 1px red;border:solid red 1px;border:red solid 1px;border:red 1px solid}',
    'h1{border:1px solid red;border:1px solid red;border:1px solid red;border:1px solid red;border:1px solid red;border:1px solid red}'
  )
);

test(
  'should order border consistently (uppercase property and value)',
  processCSS(
    'h1{BORDER:1PX SOLID RED;BORDER:1PX RED SOLID;BORDER:SOLID 1PX RED;BORDER:SOLID RED 1PX;BORDER:RED SOLID 1PX;BORDER:RED 1PX SOLID}',
    'h1{BORDER:1PX SOLID RED;BORDER:1PX SOLID RED;BORDER:1PX SOLID RED;BORDER:1PX SOLID RED;BORDER:1PX SOLID RED;BORDER:1PX SOLID RED}'
  )
);

test(
  'should order border with two properties',
  processCSS('h1{border:solid 1px}', 'h1{border:1px solid}')
);

test(
  'invalid border property should remain invalid',
  processCSS(
    'h1{border: 0 0 7px 7px solid black}',
    'h1{border: 0 0 7px 7px solid black}'
  )
);

test(
  'should order border with color functions',
  processCSS(
    'h1{border:rgba(255,255,255,0.5) dashed thick}',
    'h1{border:thick dashed rgba(255,255,255,0.5)}'
  )
);

test(
  'should order border with width function',
  passthroughCSS('p{border-left: min(10px, 1vw) solid red;}')
);

test(
  'should order border longhand',
  processCSS(
    'h1{border-left:solid 2px red;border-right:#fff 3px dashed;border-top:dotted #000 1px;border-bottom:4px navy groove}',
    'h1{border-left:2px solid red;border-right:3px dashed #fff;border-top:1px dotted #000;border-bottom:4px groove navy}'
  )
);

test(
  'should order width currentColor',
  processCSS(
    'h1{border:solid 2vmin currentColor}',
    'h1{border:2vmin solid currentColor}'
  )
);

test('should skip border:inherit', passthroughCSS('h1{border:inherit}'));

test('should skip border:initial', passthroughCSS('h1{border:initial}'));

test('should skip border:unset', passthroughCSS('h1{border:unset}'));

test(
  'should order outline consistently',
  processCSS('h1{outline:solid red .6em}', 'h1{outline:.6em solid red}')
);

test(
  'should order outline(outline-color is invert)',
  processCSS('h1{outline:solid invert 1px}', 'h1{outline:1px solid invert}')
);

test(
  'should handle -webkit-focus-ring & auto',
  processCSS(
    'h1{outline:-webkit-focus-ring-color 5px auto}',
    'h1{outline:5px auto -webkit-focus-ring-color}'
  )
);

test(
  'should order flex-flow',
  processCSS('h1{flex-flow: wrap column}', 'h1{flex-flow: column wrap}')
);

test(
  'should order flex-flow (uppercase property and value)',
  processCSS('h1{FLEX-FLOW: WRAP COLUMN}', 'h1{FLEX-FLOW: COLUMN WRAP}')
);

test(
  'should order flex-flow #1',
  processCSS(
    'h1{flex-flow: row-reverse wrap-reverse}',
    'h1{flex-flow: row-reverse wrap-reverse}'
  )
);

test('should skip flex-flow:inherit', passthroughCSS('h1{flex-flow:inherit}'));

test('should skip flex-flow:unset', passthroughCSS('h1{flex-flow: unset}'));

test('should skip flex: 1 0 auto', passthroughCSS('h1{flex: 1 0 auto;}'));

test('should skip flex: 0 1 auto', passthroughCSS('h1{flex: 0 1 auto;}'));

test(
  'should support calc width in borders',
  processCSS(
    'h1 {border: solid red calc(20px - 10px);}',
    'h1 {border: calc(20px - 10px) solid red;}'
  )
);

test(
  'should order box-shadow consistently (1)',
  processCSS('h1{box-shadow:2px 5px red}', 'h1{box-shadow:2px 5px red}')
);

test(
  'should order box-shadow consistently (2)',
  processCSS('h1{box-shadow:red 2px 5px}', 'h1{box-shadow:2px 5px red}')
);

test(
  'should order box-shadow consistently (2) (uppercase property and value)',
  processCSS('h1{BOX-SHADOW:RED 2PX 5PX}', 'h1{BOX-SHADOW:2PX 5PX RED}')
);

test(
  'should order box-shadow consistently (3)',
  processCSS(
    'h1{box-shadow:2px 5px 10px red}',
    'h1{box-shadow:2px 5px 10px red}'
  )
);

test(
  'should order box-shadow consistently (4)',
  processCSS(
    'h1{box-shadow:red 2px 5px 10px}',
    'h1{box-shadow:2px 5px 10px red}'
  )
);

test(
  'should order box-shadow consistently (5)',
  processCSS(
    'h1{box-shadow:inset red 2px 5px 10px}',
    'h1{box-shadow:inset 2px 5px 10px red}'
  )
);

test(
  'should order box-shadow consistently (6)',
  processCSS(
    'h1{box-shadow:red 2px 5px 10px inset}',
    'h1{box-shadow:inset 2px 5px 10px red}'
  )
);

test(
  'should order box-shadow consistently (6) (uppercase "inset")',
  processCSS(
    'h1{box-shadow:red 2px 5px 10px INSET}',
    'h1{box-shadow:INSET 2px 5px 10px red}'
  )
);

test(
  'should order box-shadow consistently (7)',
  processCSS(
    'h1{box-shadow:2px 5px 10px red inset}',
    'h1{box-shadow:inset 2px 5px 10px red}'
  )
);

test(
  'should order box-shadow consistently (8)',
  processCSS(
    'h1{box-shadow:red 2px 5px,blue 2px 5px}',
    'h1{box-shadow:2px 5px red,2px 5px blue}'
  )
);

test(
  'should order box-shadow consistently (9)',
  processCSS(
    'h1{box-shadow:red 2px 5px 10px inset,blue inset 2px 5px 10px}',
    'h1{box-shadow:inset 2px 5px 10px red,inset 2px 5px 10px blue}'
  )
);

test(
  'should order box-shadow consistently (10)',
  processCSS(
    'h1{box-shadow:red 2px 5px 10px inset,blue 2px 5px 10px inset}',
    'h1{box-shadow:inset 2px 5px 10px red,inset 2px 5px 10px blue}'
  )
);

test(
  'should order box-shadow consistently (11)',
  processCSS(
    'h1{box-shadow:rgba(255, 0, 0, 0.5) 2px 5px 10px inset}',
    'h1{box-shadow:inset 2px 5px 10px rgba(255, 0, 0, 0.5)}'
  )
);

test(
  'should order box-shadow consistently (12)',
  passthroughCSS('h1{box-shadow:0 0 3px}')
);

test(
  'should pass through box-shadow values that contain calc()',
  passthroughCSS('h1{box-shadow: inset 0 calc(1em + 1px) 0 1px red}')
);

test(
  'should pass through box-shadow values that contain calc() (uppercase "calc")',
  passthroughCSS('h1{box-shadow: inset 0 CALC(1em + 1px) 0 1px red}')
);

test(
  'should pass through box-shadow values that contain prefixed calc()',
  passthroughCSS('h1{box-shadow: inset 0 -webkit-calc(1em + 1px) 0 1px red}')
);

test(
  'should pass through invalid box-shadow values',
  passthroughCSS('h1{box-shadow:1px solid rgba(34,36,38,.15)}')
);

test(
  'should pass through important comments (border)',
  passthroughCSS('border: 1px /*!wow*/ red solid')
);

test(
  'should pass through important comments (box-shadow)',
  passthroughCSS('box-shadow: 0 1px 3px /*!wow*/ red')
);

test(
  'should pass through important comments (flex-flow)',
  passthroughCSS('flex-flow: row-reverse /*!wow*/ wrap-reverse')
);

test(
  'should pass through important comments (transition)',
  passthroughCSS('transition: ease-out width /*!wow*/ .5s 2s')
);

test(
  'should pass through important comments (animation)',
  passthroughCSS(
    'animation: bounce /*!wow*/ 1s linear 2s 5 normal none running'
  )
);

test(
  'should order transition consistently (1)',
  passthroughCSS('transition: width .5s ease-out 2s')
);

test(
  'should order transition consistently (2)',
  processCSS(
    'transition: ease-out width .5s 2s',
    'transition: width .5s ease-out 2s'
  )
);

test(
  'should order transition consistently (2) (uppercase property and value)',
  processCSS(
    'TRANSITION: EASE-OUT WIDTH .5S 2S',
    'TRANSITION: WIDTH .5S EASE-OUT 2S'
  )
);

test(
  'should order transition consistently (3)',
  processCSS(
    'transition: ease-out .5s width 2s',
    'transition: width .5s ease-out 2s'
  )
);

test(
  'should order transition consistently (4)',
  processCSS(
    'transition: .5s 2s width ease-out',
    'transition: width .5s ease-out 2s'
  )
);

test(
  'should order transition consistently (5)',
  processCSS(
    'transition: .5s 2s width steps(5, start)',
    'transition: width .5s steps(5, start) 2s'
  )
);

test(
  'should order transition consistently (6)',
  processCSS(
    'transition: .5s 2s width cubic-bezier(0, 0.3, 0.6, 1)',
    'transition: width .5s cubic-bezier(0, 0.3, 0.6, 1) 2s'
  )
);

test(
  'should order transition consistently (6) (uppercase "cubic-bezier")',
  processCSS(
    'transition: .5s 2s width CUBIC-BEZIER(0, 0.3, 0.6, 1)',
    'transition: width .5s CUBIC-BEZIER(0, 0.3, 0.6, 1) 2s'
  )
);

test(
  'should order transition consistently (7)',
  processCSS(
    'transition: .5s 2s width ease-out,.8s 1s height ease',
    'transition: width .5s ease-out 2s,height .8s ease 1s'
  )
);

test(
  'should order transition consistently (8)',
  processCSS(
    '-webkit-transition: ease-out width .5s 2s',
    '-webkit-transition: width .5s ease-out 2s'
  )
);

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
  'should order animation consistently (3) (frames timing function)',
  processCSS('animation: frames(3) 1s bounce', 'animation: bounce 1s frames(3)')
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
  processCSS('animation: alternate 1s bounce', 'animation: bounce 1s alternate')
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
  processCSS('animation: backwards 1s bounce', 'animation: bounce 1s backwards')
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

test(
  'should abort ordering when a var is detected (animation)',
  passthroughCSS(
    'animation: bounce /*!wow*/ 1s var(--linear) 2s 5 normal none running'
  )
);

test(
  'should abort ordering when a var is detected (animation) (uppercase "var")',
  passthroughCSS(
    'animation: bounce /*!wow*/ 1s var(--linear) 2s 5 normal none running'
  )
);

test(
  'should abort ordering when a var is detected (transition)',
  passthroughCSS('transition: .5s 2s width var(--ease)')
);

test(
  'should abort ordering when a var is detected (transition) (uppercase "var")',
  passthroughCSS('transition: .5s 2s width VAR(--ease)')
);

test(
  'should abort ordering when a var is detected (flex-flow)',
  passthroughCSS('flex-flow: wrap var(--column)')
);

test(
  'should abort ordering when a var is detected (flex-flow) (uppercase "var")',
  passthroughCSS('flex-flow: wrap VAR(--column)')
);

test(
  'should abort ordering when a var is detected (box-shadow)',
  passthroughCSS('box-shadow: 0 1px 3px var(--red)')
);

test(
  'should abort ordering when a var is detected (box-shadow) (uppercase "var")',
  passthroughCSS('box-shadow: 0 1px 3px VAR(--red)')
);

test(
  'should abort ordering when a var is detected (border)',
  passthroughCSS('border: solid 1px var(--red)')
);

test(
  'should abort ordering when a var is detected (border) (uppercase "var")',
  passthroughCSS('border: solid 1px VAR(--red)')
);

test(
  'should abort when consumed via css loader',
  passthroughCSS(
    'border: ___CSS_LOADER_IMPORT___0___ solid ___CSS_LOADER_IMPORT___1___;'
  )
);

test(
  'should abort ordering when a env is detected (border)',
  passthroughCSS('border-bottom:env(safe-area-inset-bottom) solid transparent')
);

test(
  'should abort ordering when a env is detected (border) (uppercase)',
  passthroughCSS('border-bottom:ENV(safe-area-inset-bottom) solid transparent')
);

test(
  'should abort ordering when a constant is detected (border)',
  passthroughCSS(
    'border-bottom:constant(safe-area-inset-bottom) solid transparent'
  )
);

test(
  'should abort ordering when a constant is detected (border) (uppercase)',
  passthroughCSS(
    'border-bottom:CONSTANT(safe-area-inset-bottom) solid transparent'
  )
);

test('should use the postcss plugin api', usePostCSSPlugin(plugin()));

test(
  'should order border-block',
  processCSS(
    'border-inline: dashed blue 5px; border-inline-end: red solid .5em; border-block-end: dashed blue 5px; border-block: 5px solid red;border-block-start: rgba(0, 30, 105, 0.8) solid 1px;',
    'border-inline: 5px dashed blue; border-inline-end: .5em solid red; border-block-end: 5px dashed blue; border-block: 5px solid red;border-block-start: 1px solid rgba(0, 30, 105, 0.8);'
  )
);

test(
  'should order columns only if unit is mentioned',
  processCSS(
    'h1 {columns: 2 auto;columns: auto 12em;columns: auto auto;}',
    'h1 {columns: 2 auto;columns: 12em auto;columns: auto auto;}'
  )
);

test(
  'should order columns declarations width first',
  processCSS('h1 {columns: 2 20px;}', 'h1 {columns: 20px 2;}')
);

test(
  'should preserve already ordered columns declaration',
  passthroughCSS('h1 {columns: 20px 2;}')
);

test(
  'should not crash on invalid columns declarations',
  processCSS(
    'h1 {columns: 2px 2px; columns: inherit 3rem; columns: 3rem 2 12em;}',
    'h1 {columns: 2px 2px; columns: 3rem inherit; columns: 3rem 2 12em;}'
  )
);

test(
  'should order column-rule like border',
  processCSS(
    'h1 {column-rule: solid 8px;column-rule: inset 2px #33f;}',
    'h1 {column-rule: 8px solid;column-rule: 2px inset #33f;}'
  )
);

test(
  'should order grid-auto-flow',
  processCSS(
    'grid-auto-flow: column;grid-auto-flow: dense column; grid-auto-flow: unset;grid-auto-flow: row dense;',
    'grid-auto-flow: column;grid-auto-flow: column dense; grid-auto-flow: unset;grid-auto-flow: row dense;'
  )
);

test(
  'should order grid-column-gap',
  processCSS(
    'grid-column-gap: normal; grid-column-gap: normal 3%; grid-column-gap: 3em normal;',
    'grid-column-gap: normal; grid-column-gap: normal 3%; grid-column-gap: normal 3em;'
  )
);

test(
  'should order grid-row-gap',
  processCSS(
    'grid-row-gap: normal; grid-row-gap: normal 3%; grid-row-gap: 3em normal;',
    'grid-row-gap: normal; grid-row-gap: normal 3%; grid-row-gap: normal 3em;'
  )
);

test(
  'should order grid-column',
  processCSS(
    'grid-column: 2 / 4; grid-column: 2 span / 7; grid-column: auto;grid-column: 3;grid-column: custom-indent-name / 3;',
    'grid-column: 2 /  4; grid-column: span 2 /  7; grid-column: auto;grid-column: 3;grid-column: custom-indent-name /  3;'
  )
);

test(
  'should order grid-row',
  processCSS(
    'grid-row: 2 / 4; grid-row: 2 span / 7; grid-row: auto;grid-row: 3;grid-row: custom-indent-name / 3;',
    'grid-row: 2 /  4; grid-row: span 2 /  7; grid-row: auto;grid-row: 3;grid-row: custom-indent-name /  3;'
  )
);

test(
  'should order grid-row-start',
  processCSS(
    'grid-row-start: 2 / 4; grid-row-start: 2 span / 7; grid-row-start: auto;grid-row-start: 3;grid-row-start: custom-indent-name / 3;',
    'grid-row-start: 2 /  4; grid-row-start: span 2 /  7; grid-row-start: auto;grid-row-start: 3;grid-row-start: custom-indent-name /  3;'
  )
);

test(
  'should order grid-row-end',
  processCSS(
    'grid-row-end: 2 / 4; grid-row-end: 2 span / 7; grid-row-end: auto;grid-row-end: 3;grid-row-end: custom-indent-name / 3;',
    'grid-row-end: 2 /  4; grid-row-end: span 2 /  7; grid-row-end: auto;grid-row-end: 3;grid-row-end: custom-indent-name /  3;'
  )
);

test(
  'should order grid-column-start',
  processCSS(
    'grid-column-start: 2 / 4; grid-column-start: 2 span / 7; grid-column-start: auto;grid-column-start: 3;grid-column-start: custom-indent-name / 3;',
    'grid-column-start: 2 /  4; grid-column-start: span 2 /  7; grid-column-start: auto;grid-column-start: 3;grid-column-start: custom-indent-name /  3;'
  )
);

test(
  'should order grid-column-end',
  processCSS(
    'grid-column-end: 2 / 4; grid-column-end: 2 span / 7; grid-column-end: auto;grid-column-end: 3;grid-column-end: custom-indent-name / 3;',
    'grid-column-end: 2 /  4; grid-column-end: span 2 /  7; grid-column-end: auto;grid-column-end: 3;grid-column-end: custom-indent-name /  3;'
  )
);

test(
  'should order list-style 1',
  processCSS('ul{list-style: unset}', 'ul{list-style: unset}')
);

test(
  'should order list-style 2',
  processCSS('ul{list-style: none}', 'ul{list-style: none}')
);

test(
  'should order list-style 3',
  processCSS('ul{list-style: square inside}', 'ul{list-style: square inside}')
);

test(
  'should order list-style 4',
  processCSS('ul{list-style: inside square}', 'ul{list-style: square inside}')
);

test(
  'should order list-style 5',
  processCSS('ul{list-style: square unset}', 'ul{list-style: square unset}')
);

test(
  'should order list-style 6',
  processCSS('ul{list-style: inside none}', 'ul{list-style: none inside}')
  /**
   *  This change is CORRECT as
   *  list-style: inside none;
          list-style-position: inside;
          list-style-image: initial;
          list-style-type: none;
      list-style: none inside;
          list-style-position: inside;
          list-style-image: initial;
          list-style-type: none;
   *
   */
);
test(
  'should order list-style 7',
  processCSS('ul{list-style: unset inside}', 'ul{list-style: unset inside}')
);
test(
  'should order list-style 8',
  processCSS(
    'ul{list-style: circle unset none}',
    'ul{list-style: circle unset none}'
  )
);

test(
  'should order list-style 9',
  processCSS(
    'ul{list-style: circle url("https://mdn.mozillademos.org/files/11981/starsolid.gif")}',
    'ul{list-style: circle  url("https://mdn.mozillademos.org/files/11981/starsolid.gif")}'
  )
);

test(
  'should order list-style 10', // it is invalid CSS
  processCSS('ul{list-style: circle none}', 'ul{list-style: circle none}')
);

test(
  'should order list-style 11',
  processCSS(
    'ul{list-style: unset none circle}', // it is invalid CSS
    'ul{list-style: unset none circle}' // its safe/better to leave as it is when global values and none comes
    // cause both position and image accepts  none
  )
);

test(
  'should order list-style 12',
  processCSS(
    'ul{list-style: circle url("https://mdn.mozillademos.org/files/11981/starsolid.gif") none}',
    'ul{list-style: circle none  url("https://mdn.mozillademos.org/files/11981/starsolid.gif")}'
  )
);

test(
  'should order list-style 13',
  passthroughCSS('ul{list-style: unknown unset none}')
);
test.run();
