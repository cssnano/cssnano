import { elementKeyOfIds, factsOfIds, selectorIdsOf } from './selectorIdsOf.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { VendorPrefixSummary } from '../../../../../src/passes/merge/lib/rules/vendorPrefixSummary.js';
import { RuleRecord } from '../../../../../src/passes/merge/lib/rules/ruleRecord.js';
import { selectorInfoOf } from '../../../../../src/passes/merge/lib/rules/ensureCompatibility.js';
import { SelectorIds } from '../../../../../src/passes/ir/selectorIds.js';
import { tokens as tokenize } from '../../../../../src/utils/value.js';
import { TokenLists } from '../../../../../src/passes/ir/tokenLists.js';

const browsers = ['chrome 120'];
const selectorIds = new SelectorIds();
const tokenLists = new TokenLists();
/** The facts of a selector's text, judged from its own tokens. */
const infoOf = (selector) => selectorInfoOf(tokenize(selector), browsers);
/** The facts of the ids that the records of this file hold. */
const lookup = factsOfIds(tokenLists, browsers);
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

function ruleWith(selector) {
  return postcss.parse(`${selector}{color:red}`).first;
}

/**
 * @param {import('postcss').Rule} rule
 * @return {RuleRecord} the record of a rule, for the selector facts it keeps
 */
function metaOf(rule) {
  return new RuleRecord(
    rule.selectors,
    undefined,
    selectorIdsOf(selectorIds, tokenLists, rule.selectors)
  );
}

test('getVendorProfile should match the list profile after addSelectors grows a rule whose profile was already computed', () => {
  const rule = ruleWith('.a');
  const record = metaOf(rule);
  record.vendorProfile(lookup);
  record.addSelectors(
    ['::-webkit-scrollbar', '.b'],
    selectorIdsOf(selectorIds, tokenLists, ['::-webkit-scrollbar', '.b']),
    lookup,
    elementKeyOfIds(tokenLists)
  );
  assert.deepEqual(record.vendorProfile(lookup), profileOf(record.selectors));
});

test('getSelectorText should list the selectors added by addSelectors after the text was already read', () => {
  const record = metaOf(ruleWith('.a'));
  record.selectorText();
  record.addSelectors(
    ['.b', '.c'],
    selectorIdsOf(selectorIds, tokenLists, ['.b', '.c']),
    lookup,
    elementKeyOfIds(tokenLists)
  );
  assert.equal(record.selectorText(), '.a,.b,.c');
});

test('getSelectorText should keep a comma inside :is() within one selector', () => {
  const record = metaOf(ruleWith(':is(a,b),c'));
  assert.equal(record.selectorText(), ':is(a,b),c');
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
  const a = metaOf(ruleWith('.a,.b'));
  const b = metaOf(ruleWith('.a,.b'));
  assert.equal(a.hasSameSelectors(b), true);
});

test('hasSameSelectors should fail for lists of equal length that differ', () => {
  const a = metaOf(ruleWith('.a,.b'));
  const b = metaOf(ruleWith('.a,.c'));
  assert.equal(a.hasSameSelectors(b), false);
});

test('hasSameSelectors should tell :is(a,b) from the list a,b, because a nested comma is not a list separator', () => {
  const a = metaOf(ruleWith(':is(a,b)'));
  const b = metaOf(ruleWith('a,b'));
  assert.equal(a.hasSameSelectors(b), false);
});

test('hasSameSelectors should follow a list that grew after the two lists were compared', () => {
  const a = metaOf(ruleWith('.a'));
  const b = metaOf(ruleWith('.a'));
  assert.equal(a.hasSameSelectors(b), true);
  a.addSelectors(
    ['.c'],
    selectorIdsOf(selectorIds, tokenLists, ['.c']),
    lookup
  );
  b.addSelectors(
    ['.d'],
    selectorIdsOf(selectorIds, tokenLists, ['.d']),
    lookup
  );
  assert.equal(a.hasSameSelectors(b), false);
});

test('absorbEarlier should list the selectors of the earlier rule first', () => {
  const earlier = metaOf(ruleWith('.a,.b'));
  const later = metaOf(ruleWith('.c'));
  later.absorbEarlier(earlier, lookup);
  assert.deepEqual(
    [later.selectors, later.selectorText()],
    [['.a', '.b', '.c'], '.a,.b,.c']
  );
});

test('absorbEarlier should give the profile of the combined list', () => {
  const earlier = metaOf(ruleWith('.a'));
  const later = metaOf(ruleWith('::-moz-x'));
  later.absorbEarlier(earlier, lookup);
  assert.deepEqual(later.vendorProfile(lookup), profileOf(['.a', '::-moz-x']));
});
