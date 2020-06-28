import {
  processCSSFactory,
  processCSSWithPresetFactory,
} from '../../../../util/testHelpers';
import plugin from '..';

const { processCSS } = processCSSFactory(plugin);
const { processCSS: withDefaultPreset } = processCSSWithPresetFactory(
  'default'
);

test(
  'should trim whitespace from nested functions',
  processCSS(
    'h1{width:calc(10px - ( 100px / var(--test) ))}',
    'h1{width:calc(10px - (100px / var(--test)))}'
  )
);

test(
  'should trim whitespace from nested functions (uppercase "calc")',
  processCSS(
    'h1{width:CALC(10px - ( 100px / var(--test) ))}',
    'h1{width:CALC(10px - (100px / var(--test)))}'
  )
);

test(
  'should trim whitespace from css variables',
  processCSS(
    'h1{width:var(--foo, calc(10px + 10px))}',
    'h1{width:var(--foo,calc(10px + 10px))}'
  )
);

test(
  'should trim whitespace from env variables',
  processCSS(
    'h1{width:env(--foo, calc(10px + 10px))}',
    'h1{width:env(--foo,calc(10px + 10px))}'
  )
);

test(
  'should trim whitespace from var with calc',
  processCSS(
    'h1{width:var(--foo, calc(10px * 10px))}',
    'h1{width:var(--foo,calc(10px * 10px))}'
  )
);

test(
  'should trim whitespace from nested functions (preset)',
  withDefaultPreset(
    'h1{width:calc(10px - ( 100px / var(--test) ))}',
    'h1{width:calc(10px - 100px/var(--test))}'
  )
);

test(
  'should not trim spaces inside of nested var function',
  processCSS(
    'div{background:var(--my-var, var(--my-background, pink, ))}',
    'div{background:var(--my-var,var(--my-background,pink, ))}'
  )
);
test(
  'should not trim spaces inside of var inside calc function',
  processCSS(
    'div {height: calc(var(--text-xxxl, ) * var(--text-scale-ratio-up, ))}',
    'div{height:calc(var(--text-xxxl, ) * var(--text-scale-ratio-up, ))}'
  )
);

test(
  'should not trim spaces inside of var function',
  processCSS(
    'div{border-radius:10px var(--foobar, )}',
    'div{border-radius:10px var(--foobar, )}'
  )
);

test(
  'should not trim spaces inside of env function',
  processCSS(
    'div{ border-radius:env(border-rad, ) }',
    'div{border-radius:env(border-rad, )}'
  )
);
test(
  'should not trim spaces inside of constant function',
  processCSS(
    'div{ border-radius:constant(border-rad, ) }',
    'div{border-radius:constant(border-rad, )}'
  )
);

test(
  'should not trim spaces inside of env function',
  processCSS(
    'div{ border-radius:var(border-rad, ) }',
    'div{border-radius:var(border-rad, )}'
  )
);

test(
  'should remove whitespace between the atrule and param',
  processCSS('@media (max-width:500px){}', '@media(max-width:500px){}')
);

test(
  'should remove whitespace between the atrule and param #2',
  processCSS(
    '@media  screen and (max-width:500px){}',
    '@media screen and(max-width:500px){}'
  )
);

test(
  'should remove whitespace between the atrule and param #3',
  processCSS(
    '@media screen and (color), projection   and (max-width:500px){}',
    '@media screen and(color),projection and(max-width:500px){}'
  )
);

test(
  'should remove whitespace between the atrule and param #4',
  processCSS(
    '@media screen    and (color), projection and (max-width:500px){}',
    '@media screen and(color),projection and(max-width:500px){}'
  )
);

test(
  'should remove whitespace between the atrule and param #5',
  processCSS('@supports (display: flex) {}', '@supports(display:flex){}')
);

test(
  'should remove whitespace between the atrule and param #6',
  processCSS(
    '@media  screen and (max-width:500px){ h1 { color:  red } }',
    '@media screen and(max-width:500px){h1{color:red}}'
  )
);

test(
  'should remove whitespace between the atrule and param #7',
  processCSS('@media (max-width:   500px){}', '@media(max-width:500px){}')
);

test(
  'should remove whitespace between the atrule and param #8',
  processCSS('@media (max-width: 500px){}', '@media(max-width:500px){}')
);

test(
  'should remove whitespace between the atrule and param #9',
  processCSS(
    '@media screen and (min-width: 400px) and (max-width: 700px) {}',
    '@media screen and(min-width:400px)and(max-width:700px){}'
  )
);

test(
  'should remove whitespace between the atrule and param #10',
  processCSS(
    `@media handheld and (min-width: 20em),
screen and (min-width: 20em) {}
`,
    `@media handheld and(min-width:20em),screen and(min-width:20em){}`
  )
);

test(
  'should remove whitespace between the atrule and param #11',
  processCSS('@media all and (monochrome) {}', '@media all and(monochrome){}')
);

test(
  'should remove whitespace between the atrule and param #12',
  processCSS(
    '@media print { #navigation { display: none }}',
    '@media print{#navigation{display:none}}'
  )
);

test(
  'should remove whitespace between the atrule and param #13',
  processCSS(
    `@supports (   (transition-property: color) or
         (animation-name: foo  )) and
         (transform: rotate(10deg)) {
  /* ... */
}`,
    `@supports((transition-property:color)or(animation-name:foo))and(transform:rotate(10deg)){
 /* ... */}`
  )
);
