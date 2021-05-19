import { process } from './lib/color';
import getShortestString from './lib/getShortestString';

export default (input, isLegacy = false) => {
  const instance = process(input);

  if (instance.isValid()) {
    // Try to shorten the string if it is a valid CSS color value.
    // Fall back to the original input if it's smaller or has equal length/
    return getShortestString([input, instance.toShortString({ isLegacy })]);
  } else {
    // Possibly malformed, so pass through
    return input;
  }
};
