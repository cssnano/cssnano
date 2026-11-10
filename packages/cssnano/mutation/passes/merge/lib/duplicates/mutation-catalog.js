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

export const mutations = [
  {
    name: 'give each rule its own declarations, whatever its selector',
    find: '  let declMap = ruleDecls.get(listKey);',
    replace: '  let declMap = undefined;',
  },
  {
    name: 'give each conditional group its own scope',
    find: 'childScope(scope, block.context),\n      true',
    replace: '{},\n      true',
  },
  {
    name: 'share one scope between conditional groups of different conditions',
    find: 'childScope(scope, block.context),\n      true',
    replace: 'childScope(scope, 0),\n      true',
  },
  {
    name: 'share one scope between all layers, named or anonymous',
    find: 'childScope(scope, block.context),\n      wantIds',
    replace: 'childScope(scope, 0),\n      wantIds',
  },
  {
    name: 'share the scope of anonymous layers in one container',
    find: 'childScope(scope, block.context),\n      wantIds',
    replace:
      'childScope(scope, block.node.params.trim() ? block.context : -2),\n      wantIds',
  },
  {
    name: 'drop a repeated block that declares a named layer',
    find: '  if (seenAtRules.has(id) && !run.layered.has(id)) {\n    remove(run.records, block.index);',
    replace:
      '  if (seenAtRules.has(id)) {\n    remove(run.records, block.index);',
  },
  {
    name: 'let an important comment not count as content',
    find: 'entry.important) {',
    replace: 'false) {',
  },
  {
    name: 'keep a conditional group that dedupe empties',
    find: '    if (hadContent && !hasContent(run, block)) {',
    replace: '    if (false) {',
  },
  {
    name: 'drop a conditional group that was empty before dedupe',
    find: '    if (hadContent && !hasContent(run, block)) {',
    replace: '    if (!hasContent(run, block)) {',
  },
  {
    name: 'keep a subsequent rule that dedupe empties',
    find: '  if (isSubsequent && !hasContent(run, rule)) {',
    replace: '  if (false) {',
  },
  {
    name: 'drop the first rule of a selector when dedupe empties it',
    find: '  if (isSubsequent && !hasContent(run, rule)) {',
    replace: '  if (!hasContent(run, rule)) {',
  },
  {
    name: 'skip the nested containers of a rule',
    find: '  if (!hasContainers && !wantIds) return 0;',
    replace: '  if (true) return 0;',
  },
  {
    name: 'drop a repeated @import',
    find: '  if (entry.atRuleKind === LAYER || entry.atRuleKind === IMPORT) {',
    replace: '  if (entry.atRuleKind === LAYER) {',
  },
];
