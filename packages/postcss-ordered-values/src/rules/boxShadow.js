import { unit } from 'postcss-value-parser';
import { getArguments } from 'cssnano-utils';
import addSpace from '../lib/addSpace';
import getValue from '../lib/getValue';
import mathFunctions from '../lib/mathfunctions.js';
import vendorUnprefixed from '../lib/vendorUnprefixed.js';

// box-shadow: inset? && <length>{2,4} && <color>?

export default function normalizeBoxShadow(parsed) {
  let args = getArguments(parsed);
  let abort = false;

  let values = args.reduce((list, arg) => {
    let val = [];
    let state = {
      inset: [],
      color: [],
    };

    arg.forEach((node) => {
      const { type, value } = node;

      if (
        type === 'function' &&
        mathFunctions.includes(vendorUnprefixed(value.toLowerCase()))
      ) {
        abort = true;
        return;
      }

      if (type === 'space') {
        return;
      }

      if (unit(value)) {
        val = [...val, node, addSpace()];
      } else if (value.toLowerCase() === 'inset') {
        state.inset = [...state.inset, node, addSpace()];
      } else {
        state.color = [...state.color, node, addSpace()];
      }
    });

    return [...list, [...state.inset, ...val, ...state.color]];
  }, []);

  if (abort) {
    return parsed.toString();
  }

  return getValue(values);
}
