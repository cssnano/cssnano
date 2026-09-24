import atRuleReducer from './at-rule-symbols.js';
import { cssWideKeywords, keyframes } from './slots.js';

const RESERVED = new Set([...cssWideKeywords, ...keyframes.reservedKeywords]);

/**
 * @param {(value: string, index: number) => string} encoder
 */
export default function keyframesReducer(encoder) {
  return atRuleReducer(
    {
      atRule: keyframes.atRule,
      reserved: RESERVED,
      properties: keyframes.properties,
    },
    encoder
  );
}
