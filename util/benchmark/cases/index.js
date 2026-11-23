// Focused, deterministic inputs for optimization areas where a full framework
// corpus cannot isolate the cost of one plugin.

import { caseFiles, loadCaseModule } from './modules.js';

const groups = await Promise.all(caseFiles.map(loadCaseModule));

// Later modules take precedence, as the spread order of the groups did.
export const benchmarkCases = Object.assign({}, ...groups);

// The module that defines each case, so a child loads that one alone.
export const caseFileOf = {};
for (const [index, file] of caseFiles.entries()) {
  for (const name of Object.keys(groups[index])) caseFileOf[name] = file;
}

// Named lists of cases that one command runs in turn on a single pair of
// worktrees, which saves the install of a run per case.
export const benchmarkSets = {
  // The rule merging and duplicate discarding cases of the merge records.
  'merge-ir': Object.freeze([
    'merge-rules-dense',
    'merge-rules-nested-declarations',
    'merge-duplicates-dense',
    'merge-pass-duplicates',
  ]),
};
