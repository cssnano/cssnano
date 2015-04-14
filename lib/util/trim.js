'use strict';

/**
 * Trim excess leading/trailing whitespace; wrapped method to use
 * in array iterators.
 * @param  {string} value Value to trim
 * @return {string}       The trimmed value
 */
module.exports = function trim (value) {
    return value.trim();
};
