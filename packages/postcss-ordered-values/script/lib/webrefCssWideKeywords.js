import { cssWideKeywords, expectAll } from '../../../../util/webref/webref.js';

/**
 * The CSS-wide keywords from `@webref/css`. They stay reserved here even when
 * only a draft specification defines them: a word that no custom identifier
 * can be must not be read as a color, a name or a type.
 *
 * @typedef {{ keywords: string[] }} CssWideKeywords
 * @typedef {Parameters<typeof cssWideKeywords>[0]} WebrefData
 */

/**
 * @param {WebrefData} data
 * @return {CssWideKeywords}
 */
export function buildCssWideKeywords(data) {
  return { keywords: cssWideKeywords(data) };
}

/**
 * @param {CssWideKeywords} data
 * @return {void}
 */
export function validate(data) {
  expectAll(
    data.keywords,
    ['initial', 'inherit', 'unset', 'revert', 'revert-layer'],
    'the CSS-wide keywords'
  );
}

/**
 * @param {CssWideKeywords} data
 * @return {string}
 */
export function serialize(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}
