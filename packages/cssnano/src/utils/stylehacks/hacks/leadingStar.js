/** @import {Declaration} from 'postcss'; */

const hacks = '!_$_&_*_)_=_%_+_,_._/_`_]_#_~_?_:_|'.split('_');

/**
 * A property name behind a symbol such as `*`, which only IE 7 and older read.
 * @param {Declaration} decl
 * @return {boolean}
 */
export default function leadingStarDeclaration(decl) {
  // Some symbols end up in the property instead of the raw prefix.
  const { prop } = decl;
  const { before } = decl.raws;
  for (const hack of hacks) {
    if (prop.startsWith(hack) || before?.includes(hack)) {
      return true;
    }
  }
  return false;
}
