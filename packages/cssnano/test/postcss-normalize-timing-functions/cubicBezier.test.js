import {
  oneStagePlugin,
  processCSSFactory,
} from '../../../../util/testHelpers.js';
import timing from '../../src/plugins/postcss-normalize-timing-functions/index.js';
import { testPassthrough, testTimingFunction } from './timingProperties.js';

const plugin = oneStagePlugin(timing);

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

testTimingFunction(processCSS, 'cubic-bezier(0.25, 0.1, 0.25, 1)', 'ease');
testTimingFunction(processCSS, 'CUBIC-BEZIER(0.25, 0.1, 0.25, 1)', 'ease');
testTimingFunction(processCSS, 'cubic-bezier(0, 0, 1, 1)', 'linear');
testTimingFunction(processCSS, 'cubic-bezier(0.42, 0, 1, 1)', 'ease-in');
testTimingFunction(processCSS, 'cubic-bezier(0, 0, 0.58, 1)', 'ease-out');
testTimingFunction(processCSS, 'cubic-bezier(0.42, 0, 0.58, 1)', 'ease-in-out');
testPassthrough(passthroughCSS, 'cubic-bezier(0.25, var(--foo), 0.25, 1)');
testPassthrough(
  passthroughCSS,
  'cubic-bezier(var(--foo), var(--bar), var(--baz), var(--foz))'
);
testPassthrough(passthroughCSS, 'cubic-bezier()');
testPassthrough(passthroughCSS, 'cubic-bezier(0, 0, 1, 1, 1, 1)');
testTimingFunction(processCSS, 'cubic-bezier(0.25, 0.1, 0.25, 1)', 'ease');
testTimingFunction(processCSS, 'cubic-bezier(0.250, 0.10, 0.250, 1)', 'ease');
testPassthrough(passthroughCSS, 'cubic-bezier(0.250, 1e-1px, 0.250, 1)');
testPassthrough(passthroughCSS, 'cubic-bezier(0%, 0, 1, 1)');
testPassthrough(passthroughCSS, 'cubic-bezier(0 0, 0, 1, 1)');
testPassthrough(passthroughCSS, 'cubic-bezier(0px, 0, 1, 1)');
testTimingFunction(processCSS, 'c\\75 Bic-Bezier(0, 0, 1, 1)', 'linear');
testTimingFunction(
  processCSS,
  'cubic-bezier(/*a*/ 0 /*b*/, /*c*/ 0, 1, 1)',
  'linear'
);
