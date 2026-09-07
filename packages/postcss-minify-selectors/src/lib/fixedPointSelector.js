/** @param {number} code */
function isNameCode(code) {
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    code === 95 ||
    (code >= 97 && code <= 122) ||
    code === 45
  );
}

/**
 * Classifies a narrow set of selector spellings that normalization cannot
 * change. This is not a CSS validity or canonical-syntax parser.
 *
 * @param {string} source
 */
export function isFixedPointSelector(source) {
  let index = 0;

  while (index < source.length) {
    if (source[index] === '.' || source[index] === '#') index++;

    const nameStart = index;
    while (index < source.length && isNameCode(source.charCodeAt(index))) {
      index++;
    }
    if (index === nameStart) return false;

    while (source[index] === '.' || source[index] === '#') {
      index++;
      const subclassStart = index;
      while (index < source.length && isNameCode(source.charCodeAt(index))) {
        index++;
      }
      if (index === subclassStart) return false;
    }

    if (index === source.length) return true;
    if (source[index] !== ' ') return false;
    index++;
  }

  return false;
}
