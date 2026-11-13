import { selectorIdsOf } from './selectorIdsOf.js';
import { foldedRules } from './summaryFixtures.js';
import {
  absorbEarlier,
  addSelectors,
} from '../../../../../src/passes/ir/selectorList.js';
import {
  hasSameSelectors,
  vendorSummaryOf,
} from '../../../../../src/passes/ir/selectorReads.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import selectorParser from 'postcss-selector-parser';
import { VendorPrefixSummary } from '../../../../../src/passes/ir/vendorPrefixSummary.js';
import { selectorInfoOf } from '../../../../../src/passes/ir/ensureCompatibility.js';
import { SelectorIds } from '../../../../../src/passes/ir/selectorIds.js';
import { tokens as tokenize } from '../../../../../src/utils/value.js';
import { tokensText } from '../../../../../src/values/tokensText.js';

const browsers = ['chrome 120'];
/** The ids of `selectors` in the table of a folded stylesheet's state. */
const idsIn = (state, selectors) =>
  selectorIdsOf(new SelectorIds(), state.tokenLists, selectors);
/** The facts of a selector's text, judged from its own tokens. */
const infoOf = (selector) => selectorInfoOf(tokenize(selector), browsers);
const profileOf = (selectors) =>
  VendorPrefixSummary.of(selectors.map((selector) => infoOf(selector)));

// Reference verdict: merging two selector lists keeps the same vendor
// prefix on both sides and never joins two `-ms-input-placeholder` lists.
// It reads the prefix from the pseudo-class and pseudo-element nodes of a
// parsed selector, so class names and attribute values never count.
const vendorNames = new Set(
  'ah apple atsc epub hp khtml moz ms o rim ro tc wap webkit xv'.split(' ')
);
const unescapeIdent = (raw) =>
  raw.replaceAll(/\\([0-9a-f]{1,6})\s?|\\(.)/giv, (_, hex, char) =>
    hex === undefined ? char : String.fromCodePoint(Number.parseInt(hex, 16))
  );
const pseudoNames = (selector) => {
  const names = [];
  selectorParser((root) =>
    root.walkPseudos((node) =>
      names.push(unescapeIdent(node.value.replace(/^:+/v, '')).toLowerCase())
    )
  ).processSync(selector);
  return names;
};
const prefixOfName = (name) => {
  const vendor = /^-([a-z]+)-/v.exec(name)?.[1];
  return vendorNames.has(vendor) ? `-${vendor}-` : '';
};
// '' when no pseudo is prefixed, undefined when a selector mixes prefixes
const selectorPrefix = (selector) => {
  const prefixes = new Set(pseudoNames(selector).map(prefixOfName));
  prefixes.delete('');
  if (prefixes.size > 1) return undefined;
  return [...prefixes][0] ?? '';
};
// '' when no selector is prefixed, undefined when the list is mixed
const referencePrefix = (selectors) => {
  const own = new Set(selectors.map(selectorPrefix));
  if (own.size > 1 || own.has(undefined)) return undefined;
  return [...own][0] ?? '';
};
const referenceMs = (selectors) =>
  selectors.some((selector) =>
    pseudoNames(selector).includes('-ms-input-placeholder')
  );
const referenceAllows = (a, b) => {
  const prefixA = referencePrefix(a);
  const prefixB = referencePrefix(b);
  if (prefixA === undefined || prefixB === undefined) return false;
  if (prefixA === '' && prefixB === '') return true;
  if (prefixA !== prefixB) return false;
  return !(referenceMs(a) && referenceMs(b));
};

const lists = [
  [],
  ['.a'],
  ['.a', '.b'],
  ['::-webkit-scrollbar'],
  ['::-webkit-scrollbar', '::-webkit-resizer'],
  ['.a::-webkit-scrollbar'],
  ['::-moz-selection'],
  ['::-moz-selection', '.plain'],
  ['::-moz-selection', '::-webkit-selection'],
  [':-ms-input-placeholder'],
  ['::-ms-input-placeholder'],
  ['::-MS-INPUT-PLACEHOLDER'],
  ['.a:-ms-input-placeholder', '.b:-ms-input-placeholder'],
  ['::-ms-scrollbar'],
  ['.x-moz-y'],
  ['.x-moz-y', '.plain'],
  ['[title=":-moz-x"]'],
  [':\\-moz-focusring'],
  ['.a::-moz-a:-webkit-b'],
  ['.x-ms-input-placeholder'],
  [':-MS-INPUT-PLACEHOLDER'],
  ['::-WEBKIT-scrollbar'],
];

test('VendorPrefixSummary.allowsMerge should agree with the concatenated-list reference verdict for every pair of selector lists', () => {
  for (const a of lists) {
    for (const b of lists) {
      assert.equal(
        profileOf(a).allowsMerge(profileOf(b)),
        referenceAllows(a, b),
        `${JSON.stringify(a)} + ${JSON.stringify(b)}`
      );
    }
  }
});

test('VendorPrefixSummary.add should yield the profile of the concatenated list when selectors are folded one by one', () => {
  for (const a of lists) {
    for (const more of lists) {
      const folded = profileOf(a);
      for (const selector of more) {
        folded.add(infoOf(selector));
      }
      assert.deepEqual(folded, profileOf([...a, ...more]));
    }
  }
});

test('VendorPrefixSummary.concat should yield the profile of the concatenated list for every pair of selector lists', () => {
  for (const a of lists) {
    for (const b of lists) {
      assert.deepEqual(
        profileOf(a).concat(profileOf(b)),
        profileOf([...a, ...b]),
        `${JSON.stringify(a)} + ${JSON.stringify(b)}`
      );
    }
  }
});

test('VendorPrefixSummary.concat should leave both operands unchanged', () => {
  const a = profileOf(['.a']);
  const b = profileOf(['::-moz-x']);
  a.concat(b);
  assert.deepEqual([a, b], [profileOf(['.a']), profileOf(['::-moz-x'])]);
});

test('vendorSummaryOf should match the list profile after addSelectors grows a rule whose profile was already read', () => {
  const folded = foldedRules('.a{color:red}');
  const [index] = folded.rules;
  vendorSummaryOf(folded.records, index);
  addSelectors(
    folded.records,
    index,
    selectorIdsOf(new SelectorIds(), folded.state.tokenLists, [
      '::-webkit-scrollbar',
      '.b',
    ]),
    folded.state.tokenLists,
    browsers
  );
  assert.ok(
    vendorSummaryOf(folded.records, index).sameAs(
      profileOf(['.a', '::-webkit-scrollbar', '.b'])
    )
  );
});

test('a comma inside :is() does not split a selector, so the list has two selectors', () => {
  const { records, rules, state } = foldedRules(':is(a,b),c{color:red}');
  const ids = records.rule(rules[0]).selectorIds;
  assert.deepEqual(
    ids.map((id) => tokensText(state.tokenLists.get(id))),
    [':is(a,b)', 'c']
  );
});

test('selectorInfoOf should report no vendor prefix for a class whose name contains -moz-', () => {
  assert.equal(infoOf('.x-moz-y').prefix, '');
});

test('selectorInfoOf should report no vendor prefix for an attribute value that contains :-moz-', () => {
  assert.equal(infoOf('a[title=":-moz-x"]').prefix, '');
});

test('selectorInfoOf should report the lower case prefix of a pseudo name written in upper case', () => {
  assert.equal(infoOf('a::-WEBKIT-scrollbar').prefix, '-webkit-');
});

test('selectorInfoOf should report the prefix of a pseudo name whose hyphen is a hex escape', () => {
  assert.equal(infoOf('a::\\2d moz-x').prefix, '-moz-');
});

test('selectorInfoOf should report the BlackBerry -rim- prefix of a pseudo name', () => {
  assert.equal(infoOf('a::-rim-x').prefix, '-rim-');
});

test('selectorInfoOf should leave the prefix unknown when one selector mixes two vendor prefixes', () => {
  assert.equal(infoOf('a::-moz-x::-webkit-y').prefix, undefined);
});

test('selectorInfoOf should mark an incompatible selector as such, with no prefix', () => {
  assert.deepEqual(infoOf('a::-moz-x:unknown-pseudo'), {
    compatible: false,
    prefix: undefined,
    msPlaceholder: false,
  });
});

test('selectorInfoOf should flag :-ms-input-placeholder in any letter case', () => {
  assert.equal(infoOf('a:-MS-Input-Placeholder').msPlaceholder, true);
});

test('hasSameSelectors should hold for rules whose lists are equal', () => {
  const { records, rules } = foldedRules('.a,.b{}.a,.b{}');
  assert.equal(hasSameSelectors(records, rules[0], rules[1]), true);
});

test('hasSameSelectors should fail for lists of equal length that differ', () => {
  const { records, rules } = foldedRules('.a,.b{}.a,.c{}');
  assert.equal(hasSameSelectors(records, rules[0], rules[1]), false);
});

test('hasSameSelectors should tell :is(a,b) from the list a,b, because a nested comma is not a list separator', () => {
  const { records, rules } = foldedRules(':is(a,b){}a,b{}');
  assert.equal(hasSameSelectors(records, rules[0], rules[1]), false);
});

test('hasSameSelectors should follow a list that grew after the two lists were compared', () => {
  const folded = foldedRules('.a{}.a{}');
  const [a, b] = folded.rules;
  const { state, records } = folded;
  assert.equal(hasSameSelectors(records, a, b), true);
  addSelectors(records, a, idsIn(state, ['.c']), state.tokenLists, browsers);
  addSelectors(records, b, idsIn(state, ['.d']), state.tokenLists, browsers);
  assert.equal(hasSameSelectors(records, a, b), false);
});

test('absorbEarlier should list the selectors of the earlier rule first', () => {
  const { records, rules, state } = foldedRules('.a,.b{}.c{}');
  const [earlier, later] = rules;
  absorbEarlier(records, later, earlier);
  assert.deepEqual(
    records
      .rule(later)
      .selectorIds.map((id) => tokensText(state.tokenLists.get(id))),
    ['.a', '.b', '.c']
  );
});

test('absorbEarlier should give the profile of the combined list', () => {
  const { records, rules } = foldedRules('.a{}::-moz-x{}');
  const [earlier, later] = rules;
  absorbEarlier(records, later, earlier);
  assert.ok(
    vendorSummaryOf(records, later).sameAs(profileOf(['.a', '::-moz-x']))
  );
});
