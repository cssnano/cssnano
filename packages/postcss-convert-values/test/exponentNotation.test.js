import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

describe('Exponent notation for numbers and dimensions', () => {
  test(
    'should convert large numbers with length units to exponent notation when shorter',
    processCSS(
      'h1{width:100000px;margin:100000rem;padding:1200000rem;top:123000rem;left:-100000px}',
      'h1{width:1e5px;margin:1e5rem;padding:12e5rem;top:123e3rem;left:-1e5px}'
    )
  );

  test(
    'should convert large numbers with time, percentage, and angle units to exponent notation when shorter',
    processCSS(
      'h1{transition-duration:10000s;width:10000%;rotate:10000deg}',
      'h1{transition-duration:1e4s;width:1e4%;rotate:1e4deg}'
    )
  );

  test(
    'should convert small decimal numbers with units to exponent notation when shorter',
    processCSS(
      'h1{width:0.0001px;height:0.00001px;margin:0.00012rem;padding:0.000012rem;top:-0.0001px;left:0.0001%}',
      'h1{width:1e-4px;height:1e-5px;margin:12e-5rem;padding:12e-6rem;top:-1e-4px;left:1e-4%}'
    )
  );

  test(
    'should find shortest unit conversion combining units and exponent notation',
    processCSS(
      'h1{margin:0.00012px;padding:0.000012px;transition-duration:100000000ms}',
      'h1{margin:9e-5pt;padding:9e-6pt;transition-duration:1e5s}'
    )
  );

  test(
    'should not convert numbers to exponent notation when replacement is not shorter',
    passthroughCSS(
      'h1{width:100rem;height:.001rem;margin:150rem;padding:1500rem;top:.0012rem}'
    )
  );

  test(
    'should convert unitless small decimals in alpha and transform properties to exponent notation',
    processCSS(
      'h1{opacity:0.0001;fill-opacity:0.00001;shape-image-threshold:0.0001;transform:scale(0.0001)}',
      'h1{opacity:1e-4;fill-opacity:1e-5;shape-image-threshold:1e-4;transform:scale(1e-4)}'
    )
  );

  test(
    'should simplify tiny opacity percentages to exponent notation when shorter',
    processCSS('h1{opacity:0.001%}', 'h1{opacity:1e-5}')
  );

  test(
    'should keep unitless integers in decimal notation because an exponent makes them invalid <integer> values',
    passthroughCSS(
      'h1{line-height:10000;flex-grow:10000;z-index:10000;order:10000;grid-row:10000;counter-increment:page 10000;animation:spin 1s steps(10000);grid-template-columns:repeat(10000,1fr);-ms-grid-row-span:1000;width:calc(1000*2)}'
    )
  );

  test(
    'should keep unitless integers in descriptors that only accept <integer>',
    passthroughCSS(
      '@counter-style r{system:additive;additive-symbols:1000 M,900 CM}@counter-style f{system:fixed 1000;range:1000 infinite;pad:1000 "0"}@font-palette-values --p{base-palette:1000;override-colors:1000 red}@font-feature-values F{@styleset{nice:1000}}h1{width:attr(data-n integer,1000)}'
    )
  );

  test(
    'should convert unitless numbers written with a decimal point or exponent to exponent notation when shorter',
    processCSS(
      'h1{line-height:10000.0;flex-grow:10000e0;scale:10000.5e0}',
      'h1{line-height:1e4;flex-grow:1e4;scale:10000.5}'
    )
  );

  test(
    'should disable exponent notation when allowExponent option is false',
    processCSS(
      'h1{width:100000px;margin:100000rem;opacity:0.0001;transition-duration:100000000ms}',
      'h1{width:6250pc;margin:100000rem;opacity:.0001;transition-duration:100000s}',
      { allowExponent: false }
    )
  );
});
