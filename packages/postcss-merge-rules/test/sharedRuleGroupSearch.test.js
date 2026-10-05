import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';
import {
  longSelector,
  sharedBackground,
  withHeights,
  sharedPair,
} from './sharedRuleGroupFixtures.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

const mediumSelector = (suffix) => `.${'x'.repeat(47)}_${suffix}`;
const withMediumSelectors = (declaration, suffixes) =>
  suffixes
    .map(
      (s, i) =>
        `${mediumSelector(s)}{${sharedBackground};${declaration};height:${i + 2}vw}`
    )
    .join('');

test(
  'should keep three rules apart when the group pays only while a later plugin keeps the vendor-prefixed declaration it shares in each rule',
  passthroughCSS(withMediumSelectors('-webkit-box-flex:0', ['a', 'b', 'c']))
);

test(
  'should share declarations among three rules when an unprefixed declaration of the same length replaces the vendor-prefixed one',
  processCSS(
    withMediumSelectors('border-top-width:0', ['a', 'b', 'c']),
    `${mediumSelector('a')}{height:2vw}` +
      ['a', 'b', 'c'].map(mediumSelector).join() +
      `{${sharedBackground};border-top-width:0}` +
      `${mediumSelector('b')}{height:3vw}${mediumSelector('c')}{height:4vw}`
  )
);

test(
  'should share declarations among four rules when the group pays even after a later plugin removes the vendor-prefixed declaration from each rule',
  processCSS(
    withMediumSelectors('-webkit-box-flex:0', ['a', 'b', 'c', 'd']),
    `${mediumSelector('a')}{height:2vw}` +
      ['a', 'b', 'c', 'd'].map(mediumSelector).join() +
      `{${sharedBackground};-webkit-box-flex:0}` +
      ['b', 'c', 'd']
        .map((s, i) => `${mediumSelector(s)}{height:${i + 3}vw}`)
        .join('')
  )
);

test(
  'should share declarations among many rules with long selectors nested in a rule whose own declaration precedes them',
  processCSS(
    `.p{color:red;${withHeights(['a', 'b', 'c'])}}`,
    `.p{color:red;${longSelector('a')}{height:2vw}` +
      ['a', 'b', 'c'].map(longSelector).join() +
      `{${sharedBackground}}` +
      `${longSelector('b')}{height:3vw}${longSelector('c')}{height:4vw}}`
  )
);

test(
  'should keep rules apart when sharing a declaration shortens only the source whitespace, since the minified output stays as long',
  passthroughCSS(
    '.abc { color : red ; top : 0 } .def { color : red ; left : 0 }'
  )
);

test('should not copy any rule while trying pairs of rules with long selectors whose shared declaration is too short to pay for a selector', () => {
  const css = Array.from(
    { length: 30 },
    (_, i) => `${longSelector(i)}{top:0;height:${i}px}`
  ).join('');
  const { clone } = postcss.Rule.prototype;
  let copies = 0;
  postcss.Rule.prototype.clone = function (...args) {
    copies++;
    return clone.apply(this, args);
  };
  try {
    postcss([plugin]).process(css, { from: undefined }).sync();
  } finally {
    postcss.Rule.prototype.clone = clone;
  }
  assert.equal(copies, 0);
});

test(
  'should share declarations among more rules than the search window holds, since later joins absorb the rules past the window',
  processCSS(
    withHeights(Array.from({ length: 14 }, (_, i) => `r${i}`)),
    `${longSelector('r0')}{height:2vw}` +
      Array.from({ length: 14 }, (_, i) => longSelector(`r${i}`)).join() +
      `{${sharedBackground}}` +
      Array.from(
        { length: 13 },
        (_, i) => `${longSelector(`r${i + 1}`)}{height:${i + 3}vw}`
      ).join('')
  )
);

test(
  'should not share declarations among keyframe selectors, since they cascade by position',
  passthroughCSS(
    `@keyframes k{${[
      '1.0000001',
      '2.0000001',
      '3.0000001',
      '4.0000001',
      '5.0000001',
      '6.0000001',
    ]
      .map((s, i) => `${s}%{${sharedBackground};height:${i + 2}vw}`)
      .join('')}}`
  )
);

test(
  'should leave in the leftover the second copy of a shared declaration that a joining rule sets twice, since only the first copy is claimed',
  processCSS(
    sharedPair +
      `${longSelector('c')}{${sharedBackground};background-size:contain;height:4vw}`,
    `${longSelector('a')}{height:2vw}` +
      ['a', 'b', 'c'].map(longSelector).join() +
      `{${sharedBackground}}` +
      `${longSelector('b')}{height:3vw}` +
      `${longSelector('c')}{background-size:contain;height:4vw}`
  )
);

test(
  'should not let the rules after a pair join it when the leftover of the later one overrides a shared declaration, but group them among themselves',
  processCSS(
    `${longSelector('a')}{${sharedBackground};height:2vw}` +
      `${longSelector('b')}{${sharedBackground};height:3vw;background-size:cover}` +
      ['c', 'd', 'e']
        .map(
          (s, i) => `${longSelector(s)}{${sharedBackground};height:${i + 4}vw}`
        )
        .join(''),
    `${longSelector('a')}{${sharedBackground};height:2vw}` +
      `${longSelector('b')}{${sharedBackground};height:3vw;background-size:cover}` +
      `${longSelector('c')}{height:4vw}` +
      ['c', 'd', 'e'].map(longSelector).join() +
      `{${sharedBackground}}` +
      `${longSelector('d')}{height:5vw}${longSelector('e')}{height:6vw}`
  )
);
