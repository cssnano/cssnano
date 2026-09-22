/** @param {string} url */
export const normalize = function (url) {
  return url;
};
export default {
  normalize,
  // Keep the shape of the Node path module so callers can use posix semantics.
  posix: { normalize },
};
