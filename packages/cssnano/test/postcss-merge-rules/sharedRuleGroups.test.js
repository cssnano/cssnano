import { test } from 'node:test';
import { processCSSFactory } from '../../../../util/testHelpers.js';
import plugin from '../../src/plugins/postcss-merge-rules/index.js';
import {
  longSelector,
  sharedBackground,
  withHeights,
  sharedPair,
  longerSelector,
  longestSelector,
} from './sharedRuleGroupFixtures.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

test(
  'should share declarations among many rules with long selectors although sharing them between two would not shorten the output',
  processCSS(
    withHeights(['a', 'b', 'c', 'd', 'e', 'f']),
    `${longSelector('a')}{height:2vw}` +
      ['a', 'b', 'c', 'd', 'e', 'f'].map(longSelector).join() +
      `{${sharedBackground}}` +
      ['b', 'c', 'd', 'e', 'f']
        .map((s, i) => `${longSelector(s)}{height:${i + 3}vw}`)
        .join('')
  )
);

test(
  'should keep two rules with long selectors apart when repeating the selectors costs more than the shared declarations save',
  passthroughCSS(withHeights(['a', 'b']))
);

test(
  'should keep two rules with long selectors apart when the rule after them does not set the shared declarations',
  passthroughCSS(
    `${longSelector('a')}{${sharedBackground};height:2vw}` +
      `${longSelector('b')}{${sharedBackground};height:3vw}` +
      `${longSelector('c')}{height:4vw}`
  )
);

test(
  'should keep two rules with long selectors apart when the rules after them hold comments, which a join by declarations cannot move',
  passthroughCSS(
    sharedPair +
      ['c', 'd', 'e']
        .map(
          (s, i) =>
            `${longSelector(s)}{/*k*/${sharedBackground};height:${i + 4}vw}`
        )
        .join('')
  )
);

test(
  'should keep two rules with long selectors apart when the rules after them override a shared declaration before repeating it',
  processCSS(
    sharedPair +
      ['c', 'd', 'e']
        .map(
          (s, i) =>
            `${longSelector(s)}{background-size:cover;${sharedBackground};height:${i + 4}vw}`
        )
        .join(''),
    sharedPair +
      `${longSelector('c')}{height:4vw}` +
      ['c', 'd', 'e'].map(longSelector).join() +
      `{background-size:cover;${sharedBackground}}` +
      `${longSelector('d')}{height:5vw}${longSelector('e')}{height:6vw}`
  )
);

test(
  'should keep two rules with long selectors apart when the leftover of the later one overrides a shared declaration, which blocks the rule after them from joining',
  passthroughCSS(
    `${longSelector('a')}{${sharedBackground};height:2vw}` +
      `${longSelector('b')}{${sharedBackground};height:3vw;background-size:cover}` +
      `${longSelector('c')}{${sharedBackground};height:4vw}`
  )
);

test(
  'should keep two rules with long selectors apart when only a rule that saves less than the split costs can join before an override',
  passthroughCSS(
    sharedPair +
      `${longerSelector}{${sharedBackground};height:4vw;background-size:cover}` +
      `${longSelector('d')}{${sharedBackground};height:5vw}` +
      `${longSelector('e')}{${sharedBackground};height:6vw}`
  )
);

test(
  'should share declarations among one group when a rule that saves nothing by joining stands between rules that pay for the shared rule',
  processCSS(
    sharedPair +
      `${longestSelector}{${sharedBackground};height:4vw}` +
      `${longSelector('d')}{${sharedBackground}}` +
      `${longSelector('e')}{${sharedBackground}}`,
    `${longSelector('a')}{height:2vw}` +
      [
        longSelector('a'),
        longSelector('b'),
        longestSelector,
        longSelector('d'),
        longSelector('e'),
      ].join() +
      `{${sharedBackground}}` +
      `${longSelector('b')}{height:3vw}` +
      `${longestSelector}{height:4vw}`
  )
);

test(
  'should keep two rules with long selectors apart when the rules after them stand in an at-rule, which a join by declarations cannot reach',
  passthroughCSS(
    withHeights(['a', 'b']) +
      `@media (min-width:1px){${withHeights(['c', 'd'])}}`
  )
);

// Joining each pair of adjacent `.aa` rules gives `.aa` the shared
// declaration twice, so the group pays only after the joins; a second pass
// must find nothing left to do.
test(
  'should share a declaration that joining adjacent rules repeats, in the same pass as the joins',
  processCSS(
    '.aa{margin-left:0}.aa{background:red}.bb::before{margin:0;background:red}.aa{margin-top:1px}.aa{background:red}',
    '.aa{margin-left:0}.aa,.bb::before{background:red}.bb::before{margin:0}.aa{margin-top:1px}'
  )
);

// The partial merge of `.aqqqq` leaves it with only the shared `margin-left`,
// which the earlier pair can then group; a second pass must find nothing left.
test(
  'should group a rule that a partial merge leaves with only the shared declaration, in the same pass as the merge',
  processCSS(
    '.bqqqq{top:1px;margin-left:1px}.aqqqq.bqqqq,div span{--v:blue;margin-left:1px}.aqqqq{top:1px;margin-left:1px;margin:0}span.aqqqq,span::before{top:1px;margin:0}',
    '.bqqqq{top:1px}.bqqqq,.aqqqq.bqqqq,div span,.aqqqq{margin-left:1px}.aqqqq.bqqqq,div span{--v:blue}.aqqqq,span.aqqqq,span::before{top:1px;margin:0}'
  )
);

// A join two rules after the pair gives `div span` the shared `color`, so the
// pair `p,span` and `div` must be revisited for them to group.
test(
  'should group a pair two rules back when a join later in the sheet gives the group its shared declaration',
  processCSS(
    'p,span{background:red;color:blue}div{margin:1px;color:blue}div span{margin-top:0}div span{color:blue}',
    'p,span{background:red}p,span,div,div span{color:blue}div{margin:1px}div span{margin-top:0}'
  )
);

// As above, but a preserved comment in `div` keeps it from following a pair,
// though it can still be the pair's second rule.
test(
  'should group a pair two rules back whose second rule holds a comment when a join later in the sheet gives the group its shared declaration',
  processCSS(
    'p,span{background:red;color:blue}div{/*!k*/margin:1px;color:blue}div span{margin-top:0}div span{color:blue}',
    'p,span{background:red}p,span,div,div span{color:blue}div{/*!k*/margin:1px}div span{margin-top:0}'
  )
);
