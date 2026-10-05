import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';
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
