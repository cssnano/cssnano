import {
  oneStagePlugin,
  processCSSFactory,
} from '../../../../util/testHelpers.js';
import timing from '../../src/plugins/postcss-normalize-timing-functions/index.js';
import { testPassthrough, testTimingFunction } from './timingProperties.js';

const plugin = oneStagePlugin(timing);

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

testTimingFunction(processCSS, 'steps(1, start)', 'step-start');
testTimingFunction(processCSS, 'steps(1, START)', 'step-start');
testTimingFunction(processCSS, 'STEPS(1, start)', 'step-start');
testTimingFunction(processCSS, 'steps(1, jump-start)', 'step-start');
testTimingFunction(processCSS, 'steps(1, JUMP-START)', 'step-start');
testTimingFunction(processCSS, 'STEPS(1, jump-start)', 'step-start');
testTimingFunction(processCSS, 'steps(1, end)', 'step-end');
testTimingFunction(processCSS, 'steps(1, END)', 'step-end');
testTimingFunction(processCSS, 'STEPS(1, end)', 'step-end');
testTimingFunction(processCSS, 'steps(1, jump-end)', 'step-end');
testTimingFunction(processCSS, 'steps(1, JUMP-END)', 'step-end');
testTimingFunction(processCSS, 'STEPS(1, jump-end)', 'step-end');
testPassthrough(passthroughCSS, 'steps(1)');
testPassthrough(passthroughCSS, 'STEPS(1)');
testPassthrough(passthroughCSS, 'steps(5,start)');
testTimingFunction(processCSS, 'steps(10, end)', 'steps(10)');
testTimingFunction(processCSS, 'steps(10 /*comment*/, end)', 'steps(10)');
testTimingFunction(processCSS, 'steps(10, jump-end)', 'steps(10)');
testTimingFunction(processCSS, 'steps(10, END)', 'steps(10)');
testPassthrough(passthroughCSS, 'steps(1, jump-none)');
testTimingFunction(processCSS, 'steps(10, JUMP-END)', 'steps(10)');
testPassthrough(passthroughCSS, 'steps(15)');
testPassthrough(passthroughCSS, 'fade 3s steps(10, start())');
testPassthrough(passthroughCSS, 'fade 3s steps(10, jump-start())');
testPassthrough(passthroughCSS, 'fade 3s steps(10, end())');
testPassthrough(passthroughCSS, 'fade 3s steps(10, jump-end())');
testPassthrough(passthroughCSS, 'steps(0, end)');
testPassthrough(passthroughCSS, 'steps(1.5, end)');
testPassthrough(passthroughCSS, 'steps(1px, end)');
testPassthrough(passthroughCSS, 'steps(-1, end)');
testTimingFunction(processCSS, 'StEpS(1, \\65 ND)', 'step-end');
testTimingFunction(
  processCSS,
  'steps(/*a*/ 1 /*b*/, /*c*/ jump-\\65 nd)',
  'step-end'
);
