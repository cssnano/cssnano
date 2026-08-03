'use strict';

/*
 * On the web do nothing,
 * since emulating the built-in Node.js looks quite brittle/
 */
module.exports = {
  /**
   *
   * @param {string} url
   * @returns {string}
   */
  normalize: function (url) {
    return url;
  },
};
