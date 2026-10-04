import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import {
  addToVendorProfile,
  combineVendorProfiles,
  vendorProfile,
  vendorsAllowMerge,
} from '../src/lib/vendor-profile.js';
import {
  addSelectors,
  getMeta,
  getSelectorText,
  getVendorProfile,
  hasSameSelectors,
  setSelectors,
} from '../src/lib/rule-meta.js';
import { createSelectorLookup } from '../src/lib/ensureCompatibility.js';

const lookup = createSelectorLookup(['Chrome 120']);
const profileOf = (selectors) => vendorProfile(selectors.map(lookup));

// Reference verdict: merging two selector lists keeps the same vendor
// prefix on both sides and never joins two `-ms-input-placeholder` lists.
// It reads the prefix from the pseudo-class and pseudo-element nodes of a
// parsed selector, so class names and attribute values never count.
const vendorNames = new Set(
  'ah apple atsc epub hp khtml moz ms o rim ro tc wap webkit xv'.split(' ')
);
const unescapeIdent = (raw) =>
  raw.replace(/\\([0-9a-f]{1,6})\s?|\\(.)/giv, (_, hex, char) =>
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

test('vendorsAllowMerge should agree with the concatenated-list reference verdict for every pair of selector lists', () => {
  for (const a of lists) {
    for (const b of lists) {
      assert.equal(
        vendorsAllowMerge(profileOf(a), profileOf(b)),
        referenceAllows(a, b),
        `${JSON.stringify(a)} + ${JSON.stringify(b)}`
      );
    }
  }
});

test('addToVendorProfile should yield the profile of the concatenated list when selectors are folded one by one', () => {
  for (const a of lists) {
    for (const more of lists) {
      const folded = profileOf(a);
      for (const selector of more) {
        addToVendorProfile(folded, lookup(selector));
      }
      assert.deepEqual(folded, profileOf([...a, ...more]));
    }
  }
});

test('combineVendorProfiles should yield the profile of the concatenated list for every pair of selector lists', () => {
  for (const a of lists) {
    for (const b of lists) {
      assert.deepEqual(
        combineVendorProfiles(profileOf(a), profileOf(b)),
        profileOf([...a, ...b]),
        `${JSON.stringify(a)} + ${JSON.stringify(b)}`
      );
    }
  }
});

test('combineVendorProfiles should leave both operands unchanged', () => {
  const a = profileOf(['.a']);
  const b = profileOf(['::-moz-x']);
  combineVendorProfiles(a, b);
  assert.deepEqual([a, b], [profileOf(['.a']), profileOf(['::-moz-x'])]);
});

function ruleWith(selector) {
  return postcss.parse(`${selector}{color:red}`).first;
}

test('getVendorProfile should match the list profile after addSelectors grows a rule whose profile was already computed', () => {
  const rule = ruleWith('.a');
  const ruleMeta = new WeakMap();
  const meta = getMeta(rule, ruleMeta);
  getVendorProfile(meta, lookup);
  addSelectors(meta, ['::-webkit-scrollbar', '.b'], lookup);
  assert.deepEqual(getVendorProfile(meta, lookup), profileOf(meta.selectors));
});

test('getVendorProfile should match the list profile after setSelectors replaces the list of a rule whose profile was already computed', () => {
  const rule = ruleWith('.a');
  const ruleMeta = new WeakMap();
  const meta = getMeta(rule, ruleMeta);
  getVendorProfile(meta, lookup);
  setSelectors(meta, ['::-moz-selection']);
  assert.deepEqual(
    getVendorProfile(meta, lookup),
    profileOf(['::-moz-selection'])
  );
});

test('getVendorProfile should match the list profile after setSelectors receives the combined profile of the new list', () => {
  const meta = getMeta(ruleWith('.a'), new WeakMap());
  const selectors = ['.a', '::-moz-x'];
  setSelectors(
    meta,
    selectors,
    combineVendorProfiles(profileOf(['.a']), profileOf(['::-moz-x']))
  );
  assert.deepEqual(getVendorProfile(meta, lookup), profileOf(selectors));
});

test('getSelectorText should list the selectors added by addSelectors after the text was already read', () => {
  const meta = getMeta(ruleWith('.a'), new WeakMap());
  getSelectorText(meta);
  addSelectors(meta, ['.b', '.c'], lookup);
  assert.equal(getSelectorText(meta), '.a,.b,.c');
});

test('getSelectorText should list the selectors set by setSelectors after the text was already read', () => {
  const meta = getMeta(ruleWith('.a'), new WeakMap());
  getSelectorText(meta);
  setSelectors(meta, ['.x', '.y']);
  assert.equal(getSelectorText(meta), '.x,.y');
});

test('getSelectorText should keep a comma inside :is() within one selector', () => {
  const meta = getMeta(ruleWith(':is(a,b),c'), new WeakMap());
  assert.equal(getSelectorText(meta), ':is(a,b),c');
});

test('createSelectorLookup should report no vendor prefix for a class whose name contains -moz-', () => {
  assert.equal(lookup('.x-moz-y').prefix, '');
});

test('createSelectorLookup should report no vendor prefix for an attribute value that contains :-moz-', () => {
  assert.equal(lookup('a[title=":-moz-x"]').prefix, '');
});

test('createSelectorLookup should report the lower case prefix of a pseudo name written in upper case', () => {
  assert.equal(lookup('a::-WEBKIT-scrollbar').prefix, '-webkit-');
});

test('createSelectorLookup should report the prefix of a pseudo name whose hyphen is a hex escape', () => {
  assert.equal(lookup('a::\\2d moz-x').prefix, '-moz-');
});

test('createSelectorLookup should leave the prefix unknown when one selector mixes two vendor prefixes', () => {
  assert.equal(lookup('a::-moz-x::-webkit-y').prefix, undefined);
});

test('createSelectorLookup should mark an incompatible selector as such, with no prefix', () => {
  assert.deepEqual(lookup('a::-moz-x:unknown-pseudo'), {
    compatible: false,
    prefix: undefined,
    msPlaceholder: false,
  });
});

test('createSelectorLookup should flag :-ms-input-placeholder in any letter case', () => {
  assert.equal(lookup('a:-MS-Input-Placeholder').msPlaceholder, true);
});

test('createSelectorLookup should scan a selector only once when it repeats', () => {
  const cache = new Map();
  const cached = createSelectorLookup(['Chrome 120'], cache);
  const get = cache.get.bind(cache);
  let scans = 0;
  cache.get = (key) => {
    const hit = get(key);
    if (hit === undefined) scans++;
    return hit;
  };
  cached('a::-moz-x');
  cached('a::-moz-x');
  cached('a::-moz-x');
  assert.equal(scans, 1);
});

test('hasSameSelectors should hold for rules whose lists are equal', () => {
  const a = getMeta(ruleWith('.a,.b'), new WeakMap());
  const b = getMeta(ruleWith('.a,.b'), new WeakMap());
  assert.equal(hasSameSelectors(a, b), true);
});

test('hasSameSelectors should fail for lists of equal length that differ', () => {
  const a = getMeta(ruleWith('.a,.b'), new WeakMap());
  const b = getMeta(ruleWith('.a,.c'), new WeakMap());
  assert.equal(hasSameSelectors(a, b), false);
});

test('hasSameSelectors should tell :is(a,b) from the list a,b, because a nested comma is not a list separator', () => {
  const a = getMeta(ruleWith(':is(a,b)'), new WeakMap());
  const b = getMeta(ruleWith('a,b'), new WeakMap());
  assert.equal(hasSameSelectors(a, b), false);
});

test('hasSameSelectors should follow a list that grew after the two lists were compared', () => {
  const a = getMeta(ruleWith('.a'), new WeakMap());
  const b = getMeta(ruleWith('.a'), new WeakMap());
  assert.equal(hasSameSelectors(a, b), true);
  addSelectors(a, ['.c'], lookup);
  addSelectors(b, ['.d'], lookup);
  assert.equal(hasSameSelectors(a, b), false);
});
