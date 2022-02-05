'use strict';
let nano = require('cssnano');

module.exports = function (css, opts) {
  return nano.process(css, opts);
};
