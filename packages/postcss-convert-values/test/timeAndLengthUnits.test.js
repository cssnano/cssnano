import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

describe('Time conversions', () => {
  test(
    'should convert milliseconds to seconds',
    processCSS('h1{transition-duration:500ms}', 'h1{transition-duration:.5s}')
  );

  test(
    'should convert 0ms to 0s',
    processCSS(
      'h1{animation:opacity 0ms 1000ms}',
      'h1{animation:opacity 0s 1s}'
    )
  );

  test(
    'should convert multiple comma-separated values',
    processCSS(
      'h1{animation-delay: 500ms, 1000ms}',
      'h1{animation-delay: .5s, 1s}'
    )
  );

  test(
    'should convert seconds to milliseconds',
    processCSS('h1{transition-duration:.005s}', 'h1{transition-duration:5ms}')
  );

  test(
    'should convert exponent-form numbers',
    processCSS(
      'h1{width:1e2px;transition-duration:1e3ms;letter-spacing:1e-2px}',
      'h1{width:75pt;transition-duration:1s;letter-spacing:.01px}'
    )
  );

  test(
    'should not convert negative milliseconds to seconds',
    passthroughCSS('h1{animation-duration:-569ms}')
  );

  test(
    'should preserve opaque URL tokens while converting nested math',
    processCSS(
      'h1{width:calc(192px + 1e-2px);background:url(foo\\ bar.png)}',
      'h1{width:calc(2in + .01px);background:url(foo\\ bar.png)}'
    )
  );

  test(
    'should not remove the unit from zero values (duration)',
    passthroughCSS('h1{transition-duration:0s}')
  );
});

describe('Custom properties and plus signs', () => {
  test(
    'should not remove the unit from zero values (custom properties)',
    passthroughCSS('h1{--my-variable:0px}')
  );

  test(
    'should not convert values in custom properties by default',
    passthroughCSS('h1{--my-variable:500ms}')
  );

  test(
    'should convert values in custom properties when transformCustomProperties is true',
    processCSS('h1{--my-variable:500ms}', 'h1{--my-variable:.5s}', {
      transformCustomProperties: true,
    })
  );

  test(
    'should remove unnecessary plus signs',
    processCSS('h1{width:+14px}', 'h1{width:14px}')
  );
});

describe('Length and viewport units', () => {
  test(
    'should convert px to pc',
    processCSS('h1{width:16px}', 'h1{width:1pc}')
  );

  test(
    'should convert px to pt',
    processCSS('h1{width:120px}', 'h1{width:90pt}')
  );

  test(
    'should convert px to in',
    processCSS('h1{width:192px}', 'h1{width:2in}')
  );

  test('should not convert in to px', passthroughCSS('h1{width:192in}'));

  test(
    'should strip the units from length properties',
    processCSS('h1{margin: 0em 0% 0px 0pc}', 'h1{margin: 0 0 0 0}')
  );

  test(
    'should support viewports units',
    processCSS(
      'h1,h2{letter-spacing:-0.1vmin}',
      'h1,h2{letter-spacing:-.1vmin}'
    )
  );

  test('should support ch units', passthroughCSS('a{line-height:1.1ch}'));

  test(
    'should support PX units',
    processCSS('h1{font-size:20PX}', 'h1{font-size:20PX}')
  );

  test(
    'should convert modern viewport and container query units when zero',
    processCSS(
      'h1{margin:0dvh 0cqw;padding:0svh 0vi}',
      'h1{margin:0 0;padding:0 0}'
    )
  );
});

describe('Angle units and options', () => {
  test(
    'should convert angle units',
    processCSS(
      'h1{transform: rotate(0.25turn);transform: rotate(0.25TURN)}',
      'h1{transform: rotate(90deg);transform: rotate(90deg)}'
    )
  );

  test(
    'should not convert length units',
    processCSS(
      'h1{transition-duration:500ms; width:calc(192px + 2em); width:+14px; letter-spacing:-0.1VMIN}',
      'h1{transition-duration:.5s; width:calc(192px + 2em); width:14px; letter-spacing:-.1VMIN}',
      { length: false }
    )
  );

  test(
    'should not convert time units',
    processCSS(
      'h1{transition-duration:500ms; width:calc(192px + 2em); width:+14px; letter-spacing:-0.1VMIN}',
      'h1{transition-duration:500ms; width:calc(2in + 2em); width:14px; letter-spacing:-.1VMIN}',
      { time: false }
    )
  );

  test(
    'should not convert angle units',
    processCSS(
      'h1{transform: rotate(0.25turn);transform: rotate(0.25TURN)}',
      'h1{transform: rotate(.25turn);transform: rotate(.25TURN)}',
      { angle: false }
    )
  );

  test(
    'should not remove units from angle values',
    passthroughCSS('h1{transform:rotate(0deg)}')
  );

  test(
    'should not remove units from angle values (2)',
    passthroughCSS('h1{transform:rotate(0turn)}')
  );

  test(
    'should not remove unit with zero value in hsl and hsla functions',
    passthroughCSS('h1{color:hsl(0, 0%, 244%); background:hsl(0, 0%, 0%)}')
  );

  test(
    'should preserve 0deg on the rotate property',
    passthroughCSS('h1{rotate:0deg}')
  );

  test(
    'should not corrupt scientific notation in gradient angles',
    processCSS(
      'h1{background:linear-gradient(-1e1deg,red,blue)}',
      'h1{background:linear-gradient(-10deg,red,blue)}'
    )
  );
});
