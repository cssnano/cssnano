import { cssWideKeywords, expectAll, serializeJson } from './webref.js';

/**
 * The CSS-wide keywords from `@webref/css`. They stay reserved here even when
 * only a draft specification defines them: such a word is never a custom
 * identifier, so it must not be read as a font family name, color, name or type.
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
  return serializeJson(data);
}
