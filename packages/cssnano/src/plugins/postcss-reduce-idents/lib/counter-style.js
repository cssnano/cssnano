import atRuleReducer from './at-rule-symbols.js';
import { counterStyle, cssWideKeywords } from './slots.js';
import { predefinedCounterStyles } from '../../../values/predefinedCounterStyles.js';

// Names that a generated or existing counter style must not collide with.
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
