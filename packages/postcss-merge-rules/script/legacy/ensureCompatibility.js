import caniuseApi from 'caniuse-api';
import selectorParser from 'postcss-selector-parser';
import { noVendor, pseudoElements } from '../../src/lib/ensureCompatibility.js';

const { isSupported } = caniuseApi;
const simpleSelectorRe = /^#?[-._a-z0-9 ]+$/i;
const cssSel2 = 'css-sel2';
const cssSel3 = 'css-sel3';
const level2Sel = new Set(['=', '~=', '|=']);
const level3Sel = new Set(['^=', '$=', '*=']);
const inputPlaceholderRegex = /-ms-input-placeholder/i;

const isCssMixin = (selector) => selector.at(-1) === ':';
const isHostPseudoClass = (selector) => selector.includes(':host');

/** The selector-parser implementation retained as a test/development oracle. */
export function ensureCompatibility(selectors, browsers) {
  if (selectors.some(isCssMixin) || selectors.some(isHostPseudoClass))
    return false;
  return selectors.every((selector) => {
    if (simpleSelectorRe.test(selector)) return true;
    let compatible = true;
    selectorParser((ast) => {
      ast.walk((node) => {
        const { type, value } = node;
        if (type === 'pseudo') {
          const entry = pseudoElements[value];
          if (!entry && noVendor(value)) compatible = false;
          if (entry && compatible) compatible = isSupported(entry, browsers);
        }
        if (type === 'combinator') {
          if (value.includes('~')) compatible = isSupported(cssSel3, browsers);
          if (value.includes('>') || value.includes('+'))
            compatible = isSupported(cssSel2, browsers);
        }
        if (type === 'attribute' && node.attribute) {
          if (!node.operator) compatible = isSupported(cssSel2, browsers);
          if (level2Sel.has(node.operator))
            compatible = isSupported(cssSel2, browsers);
          if (level3Sel.has(node.operator))
            compatible = isSupported(cssSel3, browsers);
          if (node.insensitive)
            compatible = isSupported('css-case-insensitive', browsers);
        }
        return compatible;
      });
    }).processSync(selector);
    return compatible;
  });
}

export const legacyMetadata = { inputPlaceholderRegex };
