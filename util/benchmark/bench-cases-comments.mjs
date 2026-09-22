// Comment-removal focused inputs for postcss-discard-comments. The frameworks
// corpus dilutes comment handling across the whole preset, so these cases
// isolate the tokenizer, removal decisions, and reconstruction paths that a
// parser migration would touch.

import { pluginCase } from './bench-case-utils.mjs';

const valueRules = Array.from(
  { length: 2000 },
  (_, index) =>
    `.value-${index}{color:re/*x*/d!important;background:url(http://example.com/*${index}*/sprite.png);margin:10px/*sep*/20px;content:"str/*kept*/";font-family:"Font/*x*/ Name",sans-serif}`
).join('');

const selectorRules = Array.from(
  { length: 2000 },
  (_, index) =>
    `.a-${index}/*c*/,.b-${index}/*c*/ > .c-${index}/*n*/{color:red}`
).join('');

const preservedRules = Array.from(
  { length: 2000 },
  (_, index) =>
    `/*! keep   multiple   spaces ${index} */.p-${index}/*! inline ${index} */{color:red}/*! custom --a:${index}; */`
).join('');

export const commentCases = {
  'comments-declaration-values': pluginCase(
    'postcss-discard-comments',
    valueRules
  ),
  'comments-selectors': pluginCase('postcss-discard-comments', selectorRules),
  'comments-preserved': pluginCase('postcss-discard-comments', preservedRules),
};
