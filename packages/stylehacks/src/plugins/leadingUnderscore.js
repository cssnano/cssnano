'use strict';
const BasePlugin = require('../plugin');
const { IE_6 } = require('../dictionary/browsers');
const { PROPERTY } = require('../dictionary/identifiers');
const { DECL } = require('../dictionary/postcss');

function vendorPrefix(prop) {
  let match = prop.match(/^(-\w+-)/);
  if (match) {
    return match[0];
  }

  return '';
}

module.exports = class LeadingUnderscore extends BasePlugin {
  constructor(result) {
    super([IE_6], [DECL], result);
  }

  detect(decl) {
    const { before } = decl.raws;

    if (before && before.includes('_')) {
      this.push(decl, {
        identifier: PROPERTY,
        hack: `${before.trim()}${decl.prop}`,
      });
    }

    if (
      decl.prop[0] === '-' &&
      decl.prop[1] !== '-' &&
      vendorPrefix(decl.prop) === ''
    ) {
      this.push(decl, {
        identifier: PROPERTY,
        hack: decl.prop,
      });
    }
  }
};
