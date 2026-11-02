export const name = 'merge-duplicates';

export const target = new URL(
  '../../../../../src/passes/merge/lib/duplicates/discardDuplicates.js',
  import.meta.url
).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../../../../test/passes/merge/lib/duplicates/*.js',
  import.meta.url
).href;

// Source text that quotes template placeholders, split so it stays a plain
// string.
const conditionScope = '`$' + '{name}\\0$' + '{atrule.params}`';
const layerScope = '`layer\\0$' + '{atrule.params}`';

export const mutations = [
  {
    name: 'give each rule its own declarations, whatever its selector',
    find: '  let declMap = seenRuleDecls.get(rule.selector);',
    replace: '  let declMap = undefined;',
  },
  {
    name: 'ignore the selector in the structural id of a rule',
    find: '    trie = step(trie, node.selector);',
    replace: '',
  },
  {
    name: 'give each conditional group its own scope',
    find: `      dedupe(atrule, childScope(scope, ${conditionScope}), interner);`,
    replace: '      dedupe(atrule, {}, interner);',
  },
  {
    name: 'share one scope between conditional groups of different conditions',
    find: `      dedupe(atrule, childScope(scope, ${conditionScope}), interner);`,
    replace: '      dedupe(atrule, childScope(scope, name), interner);',
  },
  {
    name: 'share one scope between named layers of different names',
    find: `          : childScope(scope, ${layerScope}),`,
    replace: "          : childScope(scope, 'layer'),",
  },
  {
    name: 'share the scope of a named layer with anonymous layers',
    find: '        isAnonymousLayer(atrule, interner.textTable)\n          ? {}\n          : childScope(',
    replace: '        false\n          ? {}\n          : childScope(',
  },
  {
    name: 'drop a repeated block that declares a named layer',
    find: '  if (seenAtRules.has(id) && !interner.layered.has(id)) {',
    replace: '  if (seenAtRules.has(id)) {',
  },
  {
    name: 'let a layer declaration not mark the block that holds it',
    find: '      layered ||= interner.layered.has(childId);',
    replace: '',
  },
  {
    name: 'treat a layer at-rule as not declaring a layer',
    find: "    layered = node.name.toLowerCase() === 'layer';",
    replace: '    layered = false;',
  },
  {
    name: 'drop a repeated @import',
    find: "  if (name === 'import') {",
    replace: '  if (false) {',
  },
  {
    name: 'let an important comment not count as content',
    find: "        (node.type !== 'comment' || isImportantComment(node.text))",
    replace: "        node.type !== 'comment'",
  },
  {
    name: 'count a child that a pending edit removes as content',
    find: '        node.parent === container &&\n',
    replace: '',
  },
  {
    name: 'keep a conditional group that dedupe empties',
    find: '      if (hadContent && !hasContent(atrule)) {',
    replace: '      if (false) {',
  },
  {
    name: 'drop a conditional group that was empty before dedupe',
    find: '      if (hadContent && !hasContent(atrule)) {',
    replace: '      if (!hasContent(atrule)) {',
  },
  {
    name: 'keep a subsequent rule that dedupe empties',
    find: '  if (isSubsequent && !hasContent(rule)) {',
    replace: '  if (false) {',
  },
  {
    name: 'drop the first rule of a selector when dedupe empties it',
    find: '  if (isSubsequent && !hasContent(rule)) {',
    replace: '  if (!hasContent(rule)) {',
  },
  {
    name: 'skip the nested containers of a rule',
    find: '  } else if (hasContainers) {\n    dedupe(rule, {}, interner);',
    replace: '  } else if (false) {\n    dedupe(rule, {}, interner);',
  },
  {
    name: 'let an empty block equal a statement with the same prelude',
    find: '  if (nodes) {\n    trie = step(trie, nodes.length);',
    replace: '  if (nodes?.length) {\n    trie = step(trie, nodes.length);',
  },
  {
    name: 'ignore the child count in the structural id of a container',
    find: '    trie = step(trie, nodes.length);',
    replace: '',
  },
  {
    name: 'ignore the at-rule params in its structural id',
    find: '    trie = step(trie, node.params);',
    replace: '',
  },
  {
    name: 'ignore raws.before in the structural id of an at-rule',
    find: '    trie = step(trie, trimValue(node.raws.before));',
    replace: '',
  },
  {
    name: 'ignore raws.afterName in the structural id of an at-rule',
    find: '    trie = step(trie, trimValue(node.raws.afterName));',
    replace: '',
  },
  {
    name: 'compare the at-rule raws untrimmed',
    find: '  return value ? value.trim() : value;',
    replace: '  return value;',
  },
];
