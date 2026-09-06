import { pluginCase } from './bench-case-utils.mjs';

export const selectorCases = {
  'selector-reduction': pluginCase(
    'postcss-minify-selectors',
    Array.from(
      { length: 2000 },
      (_, index) =>
        `.scope-${index} :is(.item-${index}, .item-${index}):not(.disabled) > .child-${index}{color:red}`
    ).join('')
  ),
  'nested-selector-deduplication': pluginCase(
    'postcss-minify-selectors',
    Array.from({ length: 40 }, (_, index) => {
      const selectors = Array.from(
        { length: 200 },
        (unused, selectorIndex) => `.item-${selectorIndex % 40}`
      ).join(',');

      return `.scope-${index}:is(:not(${selectors}),:not(${selectors})){color:red}`;
    }).join('')
  ),
  'function-selector-deduplication': pluginCase(
    'postcss-minify-selectors',
    Array.from({ length: 40 }, (_, index) => {
      const selectors = Array.from(
        { length: 200 },
        (unused, selectorIndex) => `:not(.item-${selectorIndex % 40})`
      ).join(',');

      return `.scope-${index}:is(${selectors}){color:red}`;
    }).join('')
  ),
  'selector-ir-long-nested': pluginCase(
    'postcss-minify-selectors',
    Array.from({ length: 120 }, (_, index) => {
      const common = `.scope-${index}:is(.a${index % 8},:not(.b${index % 8},.c${index % 8}))[data-label="x,${index}"]`;
      const edges = Array.from(
        { length: 24 },
        (unused, edgeIndex) => `${common} .item-${edgeIndex}`
      );
      return `${edges.join(',')}{color:red}`;
    }).join('')
  ),
  'selector-deep-supported-functions': pluginCase(
    'postcss-minify-selectors',
    `${':is('.repeat(12_000)}.item${')'.repeat(12_000)}{color:red}`
  ),
  'selector-deep-opaque-functions': pluginCase(
    'postcss-minify-selectors',
    `${':future('.repeat(12_000)}.item${')'.repeat(12_000)}{color:red}`
  ),
  'selector-nested-functions-with-siblings': pluginCase(
    'postcss-minify-selectors',
    Array.from(
      { length: 2_000 },
      (_, index) =>
        `.scope-${index}:is(.a-${index},:not(.b-${index},.c-${index}))>.item-${index}{color:red}`
    ).join('')
  ),
  'selector-wide-mostly-unique': pluginCase(
    'postcss-minify-selectors',
    `${Array.from(
      { length: 10_000 },
      (_, index) => `.item-${index}:not(.disabled-${index})`
    ).join(',')}{color:red}`
  ),
};
