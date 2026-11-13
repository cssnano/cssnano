export const name = 'postcss-discard-empty';
export const target = new URL(
  '../../src/plugins/postcss-discard-empty/index.js',
  import.meta.url
).href;
// node --test expands this glob, so both the plugin's and the removal's tests run.
export const test = new URL(
  '../../test/{postcss-discard-empty/index,passes/ir/discardRecords}.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'change the plugin identifier',
    target: new URL('../../src/passes/ir/discardRecords.js', import.meta.url)
      .href,
    find: "export const DISCARD_PLUGIN = 'postcss-discard-empty';",
    replace: "export const DISCARD_PLUGIN = 'postcss-keep-empty';",
  },
  {
    name: 'classify removals as warnings',
    target: new URL('../../src/passes/ir/discardRecords.js', import.meta.url)
      .href,
    find: "context.messages.push({ index, type: 'removal', plugin: DISCARD_PLUGIN });",
    replace:
      "context.messages.push({ index, type: 'warning', plugin: DISCARD_PLUGIN });",
  },
  {
    name: 'stop removing discarded nodes',
    target: new URL('../../src/passes/ir/discardRecords.js', import.meta.url)
      .href,
    find: '      removeEntry(records, index);',
    replace: '      void index;',
  },
  {
    name: 'invert empty declaration detection',
    target: new URL('../../src/passes/ir/discardRecords.js', import.meta.url)
      .href,
    find: 'isBlankTokens(tokenLists.get(record.valueList)) &&',
    replace: '!isBlankTokens(tokenLists.get(record.valueList)) &&',
  },
  {
    name: 'discard empty custom properties',
    target: new URL('../../src/passes/ir/discardRecords.js', import.meta.url)
      .href,
    find: "!record.prop.startsWith('--')",
    replace: "record.prop.startsWith('--')",
  },
  {
    name: 'invert empty rule detection',
    target: new URL('../../src/passes/ir/discardRecords.js', import.meta.url)
      .href,
    find: 'record.selectorIds.every((id) => isBlankTokens(tokenLists.get(id)))',
    replace:
      '!record.selectorIds.every((id) => isBlankTokens(tokenLists.get(id)))',
  },
  {
    name: 'invert empty container detection',
    target: new URL('../../src/passes/ir/discardRecords.js', import.meta.url)
      .href,
    find: '      (childCount === 0 && !isLayer) ||',
    replace: '      (childCount !== 0 && !isLayer) ||',
  },
  {
    name: 'invert empty at-rule detection',
    target: new URL('../../src/passes/ir/discardRecords.js', import.meta.url)
      .href,
    find: 'emptyPrelude && (!hasChildren || childCount === 0)',
    replace: '!emptyPrelude && (!hasChildren || childCount === 0)',
  },
  {
    name: 'discard parameterized at-rules',
    target: new URL('../../src/passes/ir/discardRecords.js', import.meta.url)
      .href,
    find: 'emptyPrelude && (!hasChildren || childCount === 0)',
    replace: '(!hasChildren || childCount === 0)',
  },
  {
    name: 'invert empty at-rule container detection',
    target: new URL('../../src/passes/ir/discardRecords.js', import.meta.url)
      .href,
    find: '(hasChildren && childCount === 0 && !isLayer)',
    replace: '(hasChildren && childCount !== 0 && !isLayer)',
  },
  {
    name: 'invert repeated empty layer detection',
    target: new URL('../../src/passes/ir/discardRecords.js', import.meta.url)
      .href,
    find: 'name !== undefined && childCount === 0 && this.isDeclared(layerKey)',
    replace:
      'name !== undefined && childCount === 0 && !this.isDeclared(layerKey)',
  },
  {
    name: 'drop non-empty layer bookkeeping',
    target: new URL('../../src/passes/ir/discardRecords.js', import.meta.url)
      .href,
    find: '      (this.scopes[this.scopes.length - 1] ??= new Set()).add(key);',
    replace: '      void key;',
  },
  {
    name: 'split escaped layer names',
    target: new URL('../../src/passes/ir/discardRecords.js', import.meta.url)
      .href,
    find: 'for (const segment of name.split(SEPARATOR)) {',
    replace: 'for (const segment of name.split(/[\\0.]/v)) {',
  },
  {
    name: 'drop nested layer path components',
    target: new URL('../../src/passes/ir/discardRecords.js', import.meta.url)
      .href,
    find: '      key = joinKey(key, segment);',
    replace: '      key = joinKey(parentKey, segment);',
  },
  {
    name: 'record removals at the front',
    target: new URL('../../src/passes/ir/discardRecords.js', import.meta.url)
      .href,
    find: '    context.messages.push({\n      index: parent,',
    replace: '    context.messages.unshift({\n      index: parent,',
  },
  {
    name: 'report the root instead of the removed node',
    target: new URL('../../src/passes/ir/discardRecords.js', import.meta.url)
      .href,
    find: "      context.messages.push({ index, type: 'removal', plugin: DISCARD_PLUGIN });",
    replace:
      "      context.messages.push({ index: records.root.index, type: 'removal', plugin: DISCARD_PLUGIN });",
  },
  {
    name: 'leave the ancestors a later removal empties',
    target: new URL('../../src/passes/ir/discardRecords.js', import.meta.url)
      .href,
    find: '    removeEntry(records, parent);',
    replace: '    break;',
  },
  {
    name: 'stop after the first emptied ancestor',
    target: new URL('../../src/passes/ir/discardRecords.js', import.meta.url)
      .href,
    find: '    parent = next;',
    replace: '    parent = undefined;',
  },
  {
    name: 'treat an emptied named layer as removable',
    target: new URL('../../src/passes/ir/discardRecords.js', import.meta.url)
      .href,
    find: '    const isLayer = isLayerRecord(record);\n    if (\n      !shouldDiscard(context, record, links.childCount(parent), isLayer, false)',
    replace:
      '    const isLayer = false;\n    if (\n      !shouldDiscard(context, record, links.childCount(parent), isLayer, false)',
  },
];
