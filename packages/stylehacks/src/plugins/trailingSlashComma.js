'use strict';
const BasePlugin = require('../plugin');
const isMixin = require('../isMixin');
const { IE_5_5, IE_6, IE_7 } = require('../dictionary/browsers');
const { SELECTOR } = require('../dictionary/identifiers');
const { RULE } = require('../dictionary/postcss');

module.exports = class TrailingSlashComma extends BasePlugin {
  constructor(result) {
    super([IE_5_5, IE_6, IE_7], [RULE], result);
  }

  detect(rule) {
    if (isMixin(rule)) {
      return;
    }

    const { selector } = rule;
    const trim = selector.trim();

    if (
      trim.lastIndexOf(',') === selector.length - 1 ||
      trim.lastIndexOf('\\') === selector.length - 1
    ) {
      this.push(rule, {
        identifier: SELECTOR,
        hack: selector,
      });
    }
  }
};
