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
    'should convert uppercase scientific notation and combinations with metric units',
    processCSS(
      'h1{width:1E2PX;transition-duration:1E3MS;letter-spacing:1E-2PX;height:0E0PX;margin:10E1MM;padding:0E0MM}',
      'h1{width:75pt;transition-duration:1s;letter-spacing:.01PX;height:0;margin:10cm;padding:0}'
    )
  );

  test(
    'should not expand compact scientific notation when replacement is longer',
    passthroughCSS('h1{width:1e5px;margin:1e5;top:1e-5}')
  );

  test(
    'should not convert negative milliseconds to seconds when replacement is not shorter',
    passthroughCSS('h1{animation-duration:-569ms}')
  );

  test(
    'should convert negative milliseconds to seconds when shorter',
    processCSS('h1{animation-delay:-500ms}', 'h1{animation-delay:-.5s}')
  );

  test(
    'should convert negative time values for delays',
    processCSS(
      'h1{animation-delay:-1000ms;transition-delay:-2000ms}',
      'h1{animation-delay:-1s;transition-delay:-2s}'
    )
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

  test(
    'should not convert length units when length option is false',
    processCSS('h1{width:16px;margin:0em}', 'h1{width:16px;margin:0}', {
      length: false,
    })
  );

  test(
    'should preserve zero units in vendor-prefixed line-height',
    passthroughCSS('h1{-webkit-line-height:0px;-webkit-line-height:0%}')
  );

  test(
    'should convert metric units (mm to cm)',
    processCSS(
      'h1{width:10mm;height:20mm;margin:100mm}',
      'h1{width:1cm;height:2cm;margin:10cm}'
    )
  );

  test(
    'should convert metric units (q to cm)',
    processCSS('h1{width:120q;height:1000q}', 'h1{width:3cm;height:25cm}')
  );

  test(
    'should strip unit from zero metric lengths',
    processCSS(
      'h1{width:0mm;height:0cm;margin:0q}',
      'h1{width:0;height:0;margin:0}'
    )
  );

  test(
    'should not convert metric units when length option is false',
    processCSS('h1{width:10mm}', 'h1{width:10mm}', { length: false })
  );

  test(
    'should preserve zero length in columns shorthand to prevent invalid CSS',
    passthroughCSS(
      'h1{columns:0px}h2{columns:0px 2}h3{columns:2 0px}h4{-webkit-columns:0px 2}'
    )
  );

  test(
    'should strip zero length in column-width property',
    processCSS('h1{column-width:0px}', 'h1{column-width:0}')
  );

  test(
    'should convert metric units inside columns shorthand while preserving zero lengths',
    processCSS(
      'h1{columns:100mm 2;column-count:2}',
      'h1{columns:10cm 2;column-count:2}'
    )
  );

  test(
    'should preserve zero length line-height in font shorthand',
    processCSS('h1{font:12px/0px sans-serif}', 'h1{font:9pt/0px sans-serif}')
  );

  test(
    'should preserve zero percentage line-height in font shorthand',
    processCSS('h1{font:12px/0% sans-serif}', 'h1{font:9pt/0% sans-serif}')
  );

  test(
    'should preserve zero line-height with whitespace in font shorthand',
    processCSS(
      'h1{font:12px / 0px sans-serif}',
      'h1{font:9pt / 0px sans-serif}'
    )
  );

  test(
    'should preserve zero line-height with comments in font shorthand',
    processCSS(
      'h1{font:12px/*c*///*c*/0px sans-serif}',
      'h1{font:9pt/*c*///*c*/0px sans-serif}'
    )
  );

  test(
    'should strip unit from zero font-size in font shorthand',
    processCSS('h1{font:0px/16px sans-serif}', 'h1{font:0/1pc sans-serif}')
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
    'should convert zero angle units to deg',
    processCSS(
      'h1{transform:rotate(0turn);transform:rotate(0grad)}',
      'h1{transform:rotate(0deg);transform:rotate(0deg)}'
    )
  );

  test(
    'should not convert zero angle units when angle option is false',
    passthroughCSS('h1{transform:rotate(0turn);transform:rotate(0grad)}', {
      angle: false,
    })
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

  test(
    'should not convert 0ms to 0s when time option is false',
    passthroughCSS('h1{animation-duration:0ms}', { time: false })
  );

  test(
    'should convert grad angle units',
    processCSS(
      'h1{transform:rotate(400grad);transform:rotate(200grad)}',
      'h1{transform:rotate(1turn);transform:rotate(180deg)}'
    )
  );

  test(
    'should convert frequency units',
    processCSS(
      'h1{voice-pitch:1000Hz;voice-pitch:2000Hz}',
      'h1{voice-pitch:1khz;voice-pitch:2khz}'
    )
  );

  test(
    'should convert 0khz to 0hz',
    processCSS('h1{voice-pitch:0khz}', 'h1{voice-pitch:0hz}')
  );

  test(
    'should not convert frequency units when frequency option is false',
    passthroughCSS('h1{voice-pitch:1000Hz;voice-pitch:0khz}', {
      frequency: false,
    })
  );

  test('should preserve 0Hz unit', passthroughCSS('h1{voice-pitch:0Hz}'));

  test(
    'should convert zero radians to deg',
    processCSS('h1{transform:rotate(0rad)}', 'h1{transform:rotate(0deg)}')
  );

  test(
    'should not convert zero radians when angle option is false',
    passthroughCSS('h1{transform:rotate(0rad)}', { angle: false })
  );

  test(
    'should not convert non-zero radians',
    passthroughCSS('h1{transform:rotate(1.5rad)}')
  );
});
