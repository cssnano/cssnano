import postcss from 'postcss';

import plugin from '..';

function run(testMsg = 'should work', input, output) {
  it(testMsg, (done) => {
    let result = postcss([plugin]).process(input, {
      from: undefined,
    });
    expect(result.css).toEqual(output);
    done();
  });
}

describe('transforming CSS properties', () => {
  run(
    'should safely transform the  CSS  Properties to lowercase : BORDER',
    '#main{BORDER: 1px solid black;}',
    '#main{border: 1px solid black;}'
  );
  run(
    'should safely transform the  CSS  Properties to lowercase : BACKGROUND-COLOR',
    '#main{BACKGROUND-COLOR: black;}',
    '#main{background-color: black;}'
  );
});

describe('transforming CSS selectors', () => {
  run(
    'should safely transform the  CSS id Selectors to lowercase ',
    '#main{border: 1px solid black;}',
    '#main{border: 1px solid black;}'
  );

  run(
    'should safely transform the  CSS class Selectors to lowercase',
    '.main{border: 1px solid black;}',
    '.main{border: 1px solid black;}'
  );

  run(
    'should safely transform the CSS HTML tag Selectors to lowercase',
    'LI{border: 1px solid black;}',
    'li{border: 1px solid black;}'
  );

  run(
    'no transform to lowercase required',
    'li{border: 1px solid black;}',
    'li{border: 1px solid black;}'
  );

  run(
    'should safely transform the  CSS caps multiple HTML Selectors to lowercase',
    'UL LI{border: 1px solid black;}',
    'ul li{border: 1px solid black;}'
  );

  run(
    'should safely transform the  CSS HTML Selectors to lowercase',
    'UL LI, p A{border: 1px solid black;}',
    'ul li, p a{border: 1px solid black;}'
  );

  run(
    'should safely transform the  CSS attribute Selectors to lowercase',
    '[NAME="newname"]{border: 1px solid black;}',
    '[name="newname"]{border: 1px solid black;}'
  );

  run(
    'should safely transform the  CSS attribute Selectors to lowercase',
    'DIV#antipattern:NTH-child(3).HORSEHAIR [ID="ding"] { color: yellow; }',
    'div#antipattern:nth-child(3).HORSEHAIR [id="ding"] { color: yellow; }'
  );

  run(
    'should safely transform the  CSS pseudo class Selectors to lowercase',
    'a:FIRST-CHILD{border: 1px solid black;}',
    'a:first-child{border: 1px solid black;}'
  );

  run(
    'should not transform the  CSS :active pseudo class Selectors to lowercase',
    'a:ACTIVE{border: 1px solid black;}',
    'a:ACTIVE{border: 1px solid black;}'
  );

  run(
    'should safely transform the  CSS HTML Selectors followed by id to lowercase',
    'LI#idname{border: 1px solid black;}',
    'li#idname{border: 1px solid black;}'
  );
  run(
    'should safely transform the  CSS HTML Selectors followed by class to lowercase',
    'LI.classname{border: 1px solid black;}',
    'li.classname{border: 1px solid black;}'
  );

  run(
    'should safely transform the  CSS nested classname  Selectors to lowercase',
    'classname{border: 1px solid black;}',
    'classname{border: 1px solid black;}'
  );
});
describe('transforming CSS units', () => {
  run(
    'should safely transform the absolute units to lowercase : px',
    'classname{border: 1PX solid black;}',
    'classname{border: 1px solid black;}'
  );

  run(
    'should safely transform the absolute units to lowercase : em',
    '#idname{padding: 1EM 2EM;}',
    '#idname{padding: 1em 2em;}'
  );

  run(
    'should safely transform the angle units to lowercase : deg',
    '#idname{transform : rotate(20DEG);}',
    '#idname{transform : rotate(20deg);}'
  );

  run(
    'should safely transform the Frequency units to lowercase of ',
    'p.low { pitch: 105HZ; }',
    'p.low { pitch: 105hz; }'
  );

  run(
    'should safely transform Property and Value ',
    '.classname { COLOR: RED; }',
    '.classname { color: red; }'
  );
  run(
    'should safely transform Property ',
    ':root {  --main-BG-color: coral;} .classname {   color : RED;  background-color: var(--main-BG-color);}',
    ':root {  --main-BG-color: coral;} .classname {   color : red;  background-color: var(--main-BG-color);}'
  );
  run(
    'should not transform css variable declarations',
    ':root {  --BG-COLOR: coral; --TEXT-COLOR: RED;}',
    ':root {  --BG-COLOR: coral; --TEXT-COLOR: red;}'
  );
  run(
    'should not transform font-family',
    '.fadeOut {font-family : SANS SERIF}',
    '.fadeOut {font-family : SANS SERIF}'
  );
  run(
    'should not transform the atrules params being used in the styles',
    '@keyframes fadeOut{0%{opacity:1}to{opacity:0}}.fadeOut{animation-name:fadeOut}',
    '@keyframes fadeOut{0%{opacity:1}to{opacity:0}}.fadeOut{animation-name:fadeOut}'
  );
});
