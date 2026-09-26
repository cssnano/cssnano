import atRuleReducer from './at-rule-symbols.js';
import {
  counterStyle,
  cssWideKeywords,
  predefinedCounterStyles,
} from './slots.js';

// The predefined counter styles are specified in an appendix rather than a
// grammar, so webref has no data for them;
const RESERVED = new Set([
  ...cssWideKeywords,
  ...counterStyle.reservedKeywords,
  ...predefinedCounterStyles,
  'inline',
]);

/**
 * @param {(value: string, index: number) => string} encoder
 */
export default function counterStyleReducer(encoder) {
  return atRuleReducer(
    {
      atRule: counterStyle.atRule,
      reserved: RESERVED,
      properties: counterStyle.properties,
      functionProperties: counterStyle.functionProperties,
      functions: counterStyle.functions,
      descriptors: counterStyle.descriptors,
    },
    encoder
  );
}
