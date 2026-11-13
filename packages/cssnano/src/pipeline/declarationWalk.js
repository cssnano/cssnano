import { tokenize, TokenType } from '@csstools/css-tokenizer';
import { RULE } from '../passes/ir/blockRecord.js';
import {
  writeBefore,
  writeBetween,
  writeImportantSpelling,
} from '../passes/ir/rawEdits.js';
import { sourceListOf } from '../passes/ir/writtenList.js';
import { writeValueList } from '../passes/ir/valueEdits.js';
import { tokenizeMode } from '../values/tokenizeMode.js';
import { replaceComments } from './comments/replaceComments.js';
import { foldList, planEntry } from './plan.js';

/** @import {ArenaIndex} from '../passes/ir/blockRecord.js' */
/** @import {DeclarationRecord} from '../passes/ir/declarationRecord.js' */
/** @import {TokenListId} from '../passes/ir/tokenLists.js' */
/** @import {BlockRecords} from '../passes/ir/blockRecords.js' */
/** @import {RunContext} from '../passes/ir/runContext.js' */
/** @import {CommentState} from './comments/nodeComments.js' */
/** @import {PlanEntry} from './plan.js' */
/** @import {Stage} from './host.js' */

/**
 * What the record walk applies to the declarations of one stylesheet: the
 * stages, the plan of each property seen so far, the comment removal, and
 * whether whitespace is normalized.
 * @typedef {object} DeclarationPlans
 * @property {readonly Stage[]} stages in pipeline order
 * @property {Map<string, PlanEntry>} properties the plan of each property name as written
 * @property {CommentState | null} comments the comment removal, or null when no stage removes comments
 * @property {boolean} normalizeWhitespace whether normalizeWhitespace is on, which strips the stray semicolons
 */

/**
 * @param {readonly Stage[]} stages in pipeline order
 * @param {boolean} normalizeWhitespace
 * @param {CommentState | null} comments
 * @returns {DeclarationPlans}
 */
export function declarationPlansOf(stages, normalizeWhitespace, comments) {
  return { stages, properties: new Map(), comments, normalizeWhitespace };
}

/**
 * @param {readonly Stage[]} stages in pipeline order
 * @param {string} property
 * @returns {PlanEntry}
 */
function propertyEntry(stages, property) {
  /** @type {import('./host.js').Reducer[]} */
  const reducers = [];
  for (const stage of stages) {
    const reducer = stage.forProperty?.(property) ?? null;
    if (reducer !== null) reducers.push(reducer);
  }
  return planEntry(reducers, tokenizeMode(property), false);
}

/**
 * The declaration record at an index, which the walk only visits for declarations.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @returns {DeclarationRecord}
 */
function declarationAt(records, index) {
  return /** @type {DeclarationRecord} */ (records.entry(index));
}

/**
 * Removes the stray semicolons from the whitespace before a declaration, which
 * the previous sibling does not need. A declaration that follows a rule keeps
 * its raw, since the parser gives no semicolon there that the output needs to
 * drop.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 */
function stripStrayRawSemicolon(records, index) {
  const { before } = records.entry(index);
  if (before === null || !before.includes(';')) return;
  const prev = records.links.prevSibling(index);
  if (prev !== -1 && records.entry(prev).kind !== RULE) {
    writeBefore(records, index, before.replaceAll(';', ''));
  }
}

/**
 * Removes the comments in the gap between a declaration's property and value.
 * A custom property keeps its whitespace, and `: ` stands in for it when every
 * comment goes.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @param {CommentState} comments
 */
function removeBetweenComments(records, index, comments) {
  const { between, prop } = declarationAt(records, index);
  if (between === null || !between.includes('/*')) return;
  const preserveWhitespace = prop.startsWith('--');
  let next = replaceComments(
    tokenize({ css: between }),
    comments.canRemove,
    ' ',
    preserveWhitespace
  );
  if (preserveWhitespace && !next.includes('/*')) next = ': ';
  writeBetween(records, index, next);
}

/**
 * Removes the comments from a declaration's `!important` flag, which keeps its
 * own spelling when it has none left.
 *
 * @param {BlockRecords} records
 * @param {ArenaIndex} index
 * @param {CommentState} comments
 */
function removeImportantComments(records, index, comments) {
  const spelling = declarationAt(records, index).importantSpelling;
  if (spelling === null || !spelling.includes('/*')) return;
  const cleaned = replaceComments(
    tokenize({ css: spelling }),
    comments.canRemove
  );
  const hasComment = tokenize({ css: cleaned }).some(
    ([type]) => type === TokenType.Comment
  );
  writeImportantSpelling(records, index, hasComment ? cleaned : '!important');
}

/**
 * The id of a declaration's value without its comments. A value without a
 * comment start keeps its id. Otherwise the cleaned text is interned in the
 * run, in the mode of the property.
 *
 * @param {RunContext} run
 * @param {TokenListId} source the id of the value as written
 * @param {string} prop
 * @param {CommentState} comments
 * @returns {TokenListId}
 */
function commentFreeIdOf(run, source, prop, comments) {
  if (!run.tokenLists.holdsCommentStart(source)) return source;
  const cleaned = replaceComments(
    run.tokenLists.get(source),
    comments.canRemove,
    ' ',
    prop.startsWith('--')
  );
  return run.valueIds.idOf(run.tokenLists, tokenizeMode(prop), cleaned);
}

/**
 * Runs the declaration part of the walk over one declaration record, in
 * document order: its stray semicolon, its comments, then its value's fold.
 * A value is written only when its id changes, so a declaration no stage or
 * comment removal changed stays unmarked.
 *
 * @param {DeclarationPlans} plans
 * @param {BlockRecords} records
 * @param {RunContext} run
 * @param {number} context the context of the container that holds the declaration
 * @param {ArenaIndex} index the declaration's index
 */
export function visitDeclaration(plans, records, run, context, index) {
  const { prop } = declarationAt(records, index);
  if (plans.normalizeWhitespace && !prop.startsWith('--')) {
    stripStrayRawSemicolon(records, index);
  }
  let entry = plans.properties.get(prop);
  if (entry === undefined) {
    entry = propertyEntry(plans.stages, prop);
    plans.properties.set(prop, entry);
  }
  const { comments } = plans;
  if (comments === null && entry.plan === null) return;
  const source = /** @type {TokenListId} */ (
    sourceListOf(declarationAt(records, index))
  );
  let id = source;
  if (comments !== null) {
    removeBetweenComments(records, index, comments);
    id = commentFreeIdOf(run, source, prop, comments);
    removeImportantComments(records, index, comments);
  }
  const result =
    entry.plan === null ? id : foldList(entry, id, context, run, index);
  if (result !== source) writeValueList(records, run, index, result);
}
