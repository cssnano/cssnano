import { pluginCase } from './bench-case-utils.mjs';

export const orderedCases = {
  'ordered-values-tokenization': pluginCase(
    'postcss-ordered-values',
    Array.from({ length: 250 }, (_, index) => {
      const nested = `calc((var(--delay-${index}, 1s) + min(2s, 3s)))`;
      return [
        `.flat-${index}{transition:opacity 1s linear ${index}ms}`,
        `.nested-${index}{transition:transform ${nested} ease-in}`,
        `.comment-${index}{animation:fade/**/ 1s linear ${index}ms}`,
        `.variable-${index}{border:var(--border-${index}) solid red}`,
        `.grouped-${index}{box-shadow:rgb(0 0 0 / .2) 1px 2px}`,
      ].join('');
    }).join('')
  ),
  'ordered-value-normalization': pluginCase(
    'postcss-ordered-values',
    Array.from(
      { length: 200 },
      (_, index) =>
        `.grid-${index}{animation:2s ease-in ${index % 2 ? 'reverse' : 'normal'} 1s slide-${index};transition:opacity 1s ease-in 0s;background:top left/cover no-repeat url(image-${index}.png)}`
    ).join('')
  ),
  'ordered-value-cache-sharing': pluginCase(
    'postcss-ordered-values',
    Array.from(
      { length: 200 },
      (_, index) =>
        `.cache-${index}{border:solid 1px red;border-top:red solid 1px;border-right:1px red solid;border-bottom:solid red 1px;border-left:red 1px solid;grid-column:2 / 1;grid-row:1 / 2;grid-column-start:2;grid-row-start:1;flex-flow:wrap column;list-style:disc inside}`
    ).join('')
  ),
  'ordered-value-tokenization': pluginCase(
    'postcss-ordered-values',
    Array.from(
      { length: 200 },
      (_, index) =>
        `.tokens-${index}{border:1px solid red;outline:solid ${index}px blue;flex-flow:column wrap;transition:opacity 1s ease-in;animation:2s ease-in slide-${index};box-shadow:rgba(0,0,0,.2) 0 min(10px,2vw);border-color:var(--color,red) solid 1px;list-style:inside url("a,b") square}`
    ).join('')
  ),
};
