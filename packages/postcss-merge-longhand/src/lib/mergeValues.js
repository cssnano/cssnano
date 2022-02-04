'use strict';
const getValue = require('./getValue');

module.exports = (...rules) => rules.map(getValue).join(' ');
