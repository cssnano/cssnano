'use strict';
const BasePlugin = require('../plugin.js');
const { IE_6, IE_7, IE_8 } = require('../dictionary/browsers');
const { VALUE } = require('../dictionary/identifiers');
const { DECL } = require('../dictionary/postcss');

module.exports = class Slash9 extends BasePlugin {
  constructor(result) {
    super([IE_6, IE_7, IE_8], [DECL], result);
  }

  detect(decl) {
    let v = decl.value;
    if (v && v.length > 2 && v.indexOf('\\9') === v.length - 2) {
      this.push(decl, {
        identifier: VALUE,
        hack: v,
      });
    }
  }
};
