import { test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';
import {
  longSelector,
  sharedBackground,
  withHeights,
  sharedPair,
  longestSelector,
} from './sharedRuleGroupFixtures.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

const sharedCustomProperty =
  '--long-custom-property-name-for-sharing:something-quite-long-indeed';

test(
  'should share declarations among many rules with long selectors inside an at-rule',
  processCSS(
    `@media (min-width:1px){${withHeights(['a', 'b', 'c', 'd', 'e', 'f'])}}`,
    `@media (min-width:1px){${longSelector('a')}{height:2vw}` +
      ['a', 'b', 'c', 'd', 'e', 'f'].map(longSelector).join() +
      `{${sharedBackground}}` +
      ['b', 'c', 'd', 'e', 'f']
        .map((s, i) => `${longSelector(s)}{height:${i + 3}vw}`)
        .join('') +
      '}'
  )
);

test(
  'should share declarations among three rules with long selectors when the third pays for the split the pair alone does not',
  processCSS(
    withHeights(['a', 'b', 'c']),
    `${longSelector('a')}{height:2vw}` +
      ['a', 'b', 'c'].map(longSelector).join() +
      `{${sharedBackground}}` +
      `${longSelector('b')}{height:3vw}${longSelector('c')}{height:4vw}`
  )
);

test(
  'should keep rules apart when the declaration they share is a vendor-prefixed one that a later plugin may remove from each rule',
  passthroughCSS(
    ['a', 'b', 'c', 'd']
      .map((s, i) => `${longSelector(s)}{-webkit-box-flex:0;height:${i + 2}vw}`)
      .join('')
  )
);

test(
  'should keep two rules with long selectors apart when a declaration of the enclosing rule separates the rule after them, which must not move across it',
  passthroughCSS(
    `.p{${withHeights(['a', 'b'])}color:red;${longSelector('c')}{${sharedBackground};height:4vw}}`
  )
);

test(
  'should leave out of the shared rule a rule after the group whose selector costs more than its shared declarations save',
  processCSS(
    sharedPair +
      `${longSelector('c')}{${sharedBackground};height:4vw}` +
      `${longestSelector}{${sharedBackground};height:5vw}`,
    `${longSelector('a')}{height:2vw}` +
      ['a', 'b', 'c'].map(longSelector).join() +
      `{${sharedBackground}}` +
      `${longSelector('b')}{height:3vw}${longSelector('c')}{height:4vw}` +
      `${longestSelector}{${sharedBackground};height:5vw}`
  )
);

test(
  'should end the group before a rule with a vendor-prefixed pseudo-element, which would make browsers without it drop the shared rule',
  processCSS(
    sharedPair +
      `${longSelector('c')}::-moz-selection{${sharedBackground};height:4vw}` +
      withHeights(['d', 'e', 'f']),
    sharedPair +
      `${longSelector('c')}::-moz-selection{${sharedBackground};height:4vw}` +
      `${longSelector('d')}{height:2vw}` +
      ['d', 'e', 'f'].map(longSelector).join() +
      `{${sharedBackground}}` +
      `${longSelector('e')}{height:3vw}${longSelector('f')}{height:4vw}`
  )
);

test(
  'should count a selector the shared rule already lists as free when a later rule with that selector joins',
  processCSS(
    `${longestSelector}{${sharedBackground};height:2vw}` +
      `${longSelector('b')}{${sharedBackground};height:3vw}` +
      `${longestSelector}{${sharedBackground};height:4vw}`,
    `${longestSelector}{height:2vw}` +
      `${longestSelector},${longSelector('b')}{${sharedBackground}}` +
      `${longSelector('b')}{height:3vw}${longestSelector}{height:4vw}`
  )
);

test(
  'should share a custom property among rules that also set all, since all does not reset custom properties',
  processCSS(
    ['a', 'b', 'c']
      .map(
        (s, i) =>
          `${longSelector(s)}{${sharedCustomProperty};all:unset;height:${i + 2}vw}`
      )
      .join(''),
    `${longSelector('a')}{all:unset;height:2vw}` +
      ['a', 'b', 'c'].map(longSelector).join() +
      `{${sharedCustomProperty}}` +
      `${longSelector('b')}{all:unset;height:3vw}` +
      `${longSelector('c')}{all:unset;height:4vw}`
  )
);

test(
  'should let a rule join the shared rule when it spells a shared property in another case, since property names are ASCII case-insensitive',
  processCSS(
    sharedPair +
      `${longSelector('c')}{BACKGROUND-POSITION:50%;background-repeat:no-repeat;background-size:contain;height:4vw}`,
    `${longSelector('a')}{height:2vw}` +
      ['a', 'b', 'c'].map(longSelector).join() +
      `{${sharedBackground}}` +
      `${longSelector('b')}{height:3vw}${longSelector('c')}{height:4vw}`
  )
);

test(
  'should keep two rules with long selectors apart when the rule after them repeats a shared declaration as important, which is a different declaration',
  passthroughCSS(
    sharedPair +
      `${longSelector('c')}{background-position:50%!important;background-repeat:no-repeat;background-size:contain;height:4vw}`
  )
);
