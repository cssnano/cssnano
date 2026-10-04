import { addToVendorProfile, vendorProfile } from './vendor-profile.js';

/** @import {Declaration, Rule} from 'postcss' */
/** @import {VendorProfile} from './vendor-profile.js' */
/** @typedef {(selector: string) => import('./ensureCompatibility.js').SelectorInfo} SelectorLookup */

/**
 * @typedef {Object} RuleMeta
 * @property {string[]} selectors
 * @property {Declaration[]} declarations
 * @property {VendorProfile} [vendor] derived from `selectors`; change the list
 * only through `addSelectors` and `setSelectors` so the two stay in step
 * @property {string} [selectorText] `selectors` joined by commas, once known
 */

/**
 * @param {import('postcss').ChildNode} node
 * @return {node is Declaration}
 */
function isDeclaration(node) {
  return node.type === 'decl';
}

/**
 * @param {Rule} rule
 * @param {WeakMap<Rule, RuleMeta>} [ruleMeta]
 * @return {RuleMeta}
 */
export function getMeta(rule, ruleMeta) {
  if (ruleMeta && rule) {
    let meta = ruleMeta.get(rule);
    if (!meta && rule.nodes) {
      meta = {
        selectors: rule.selectors,
        declarations: rule.nodes.filter(isDeclaration),
      };
      ruleMeta.set(rule, meta);
    }
    return meta ?? { selectors: [], declarations: [] };
  }
  return {
    selectors: rule?.selectors ?? [],
    declarations: rule?.nodes?.filter(isDeclaration) ?? [],
  };
}

/**
 * @param {RuleMeta} meta
 * @param {SelectorLookup} lookup
 * @return {VendorProfile}
 */
export function getVendorProfile(meta, lookup) {
  meta.vendor ??= vendorProfile(meta.selectors.map(lookup));
  return meta.vendor;
}

/**
 * @param {RuleMeta} meta
 * @return {string}
 */
export function getSelectorText(meta) {
  meta.selectorText ??= meta.selectors.join(',');
  return meta.selectorText;
}

/**
 * Lists of different lengths differ in text too, since a selector holds no
 * top-level comma, so the text of long lists is joined only when needed.
 *
 * @param {RuleMeta} a
 * @param {RuleMeta} b
 * @return {boolean}
 */
export function hasSameSelectors(a, b) {
  return (
    a.selectors.length === b.selectors.length &&
    getSelectorText(a) === getSelectorText(b)
  );
}

/**
 * @param {RuleMeta} meta
 * @param {string[]} selectors appended to the rule's selector list
 * @param {SelectorLookup} lookup
 */
export function addSelectors(meta, selectors, lookup) {
  meta.selectorText = undefined;
  for (const selector of selectors) {
    meta.selectors.push(selector);
    if (meta.vendor) addToVendorProfile(meta.vendor, lookup(selector));
  }
}

/**
 * @param {RuleMeta} meta
 * @param {string[]} selectors replaces the rule's selector list
 * @param {VendorProfile} [vendor] the profile of `selectors` when the caller
 * already knows it; otherwise it is derived on the next `getVendorProfile`
 */
export function setSelectors(meta, selectors, vendor) {
  meta.selectors = selectors;
  meta.selectorText = undefined;
  meta.vendor = vendor;
}

/** @param {Rule} rule @return {Declaration[]} */
export function getDecls(rule) {
  return rule.nodes.filter(isDeclaration);
}
