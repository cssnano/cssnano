/**
 * A comment whose text starts with `!` is the convention for licenses and notices
 * that minifiers keep.
 * @param {string} text comment text, excluding the delimiters
 * @return {boolean}
 */
function isImportantComment(text) {
  return text.startsWith('!');
}

export default isImportantComment;
