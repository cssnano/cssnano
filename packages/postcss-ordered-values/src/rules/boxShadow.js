import { unit } from 'postcss-value-parser';
import getArguments from 'lerna:cssnano-util-get-arguments';
import isNodeValueEqual from '../lib/isNodeValueEqual';
import isMathFunctionNode from '../lib/isMathFunctionNode';
import addSpace from '../lib/addSpace';
import getValue from '../lib/getValue';
import isSpaceNode from '../lib/isSpaceNode';

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
      const { value } = node;

      if (isMathFunctionNode(node)) {
        abort = true;
        return;
      }

      if (isSpaceNode(node)) {
        return;
      }

      if (unit(value)) {
        val = [...val, node, addSpace()];
      } else if (isNodeValueEqual('inset', node)) {
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
