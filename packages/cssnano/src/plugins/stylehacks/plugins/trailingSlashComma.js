import BasePlugin from '../plugin.js';
import isMixin from '../isMixin.js';
import { SELECTOR } from '../dictionary/identifiers.js';
import { RULE } from '../dictionary/postcss.js';

export default (class TrailingSlashComma extends BasePlugin {
  /** @param {import('postcss').Result=} result */
  constructor(result) {
    super('stylehacks-trailing-slash-comma-ie5.5-7', [RULE], result);
  }

  /**
   * @param {import('postcss').Rule} rule
   * @return {void}
   */
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
});
