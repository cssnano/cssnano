const hacks = '!_$_&_*_)_=_%_+_,_._/_`_]_#_~_?_:_|'.split('_');

/**
 * A property name behind a symbol such as `*`, which only IE 7 and older read.
 * @param {string} prop
 * @param {string | undefined} before the raw text before the declaration
 * @return {boolean}
 */
export default function leadingStarDeclaration(prop, before) {
  // Some symbols end up in the property instead of the raw prefix.
  for (const hack of hacks) {
    if (prop.startsWith(hack) || before?.includes(hack)) {
      return true;
    }
  }
  return false;
}
