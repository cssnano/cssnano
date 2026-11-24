import { tokenize, TokenType } from '@csstools/css-tokenizer';
import cssnanoUtils from '#utils';
import { AT_RULE_BLOCK, DECLARATION, RULE } from '../ir/blockRecord.js';
import {
  writeAfter,
  writeBetween,
  writeImportantSpelling,
} from '../ir/rawEdits.js';
import { sourceListOf } from '../ir/writtenList.js';
import { writeValueList } from '../ir/valueEdits.js';
import { tokenizeMode } from '../values/tokenizeMode.js';
import { tokensText } from '../values/tokensText.js';
import { replaceComments } from './comments/replaceComments.js';
import {
  stripStrayRawSemicolon,
  withBlockEscape,
  withEscapeKept,
} from './whitespaceRaws.js';
import { foldList, planEntry } from './plan.js';

/** @import {ArenaIndex} from '../ir/blockRecord.js' */
/** @import {DeclarationRecord} from '../ir/declarationRecord.js' */
/** @import {RuleRecord} from '../ir/ruleRecord.js' */
/** @import {BlockRecord} from '../ir/blockRecord.js' */
/** @import {TokenListId} from '../ir/tokenLists.js' */
/** @import {BlockRecords} from '../ir/blockRecords.js' */
/** @import {RunContext} from './runContext.js' */
/** @import {CommentState} from './comments/commentState.js' */
/** @import {PlanEntry} from './plan.js' */
/** @import {Stage} from './host.js' */

/**
 * What the record walk applies to the declarations and rules of one stylesheet:
 * the stages, the plan of each property seen so far, the plan of the selectors,
 * the comment removal, and whether whitespace is normalized.
 * @typedef {object} DeclarationPlans
 * @property {readonly Stage[]} stages in pipeline order
 * @property {Map<string, PlanEntry>} properties the plan of each property name as written
 * @property {PlanEntry} selectors the plan of the selectors of the rules
 * @property {Map<string, PlanEntry>} atRules the plan of each at-rule name, as folded
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
  return {
    stages,
    properties: new Map(),
    selectors: planEntry(
      stages.flatMap((stage) =>
        stage.selector !== undefined ? [stage.selector] : []
      ),
      undefined,
      false
    ),
    atRules: new Map(),
    comments,
    normalizeWhitespace,
  };
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
  // A newline before the flag may end an invalid escape, so it stays.
  const bare = cssnanoUtils.isCSSNewline(spelling.charCodeAt(0))
    ? '\n!important'
    : '!important';
  writeImportantSpelling(records, index, hasComment ? cleaned : bare);
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
 * The declaration part of a walk that has no stages: the character an escape
 * at the end of its block takes, which the merge must not leave behind when it
 * moves the declaration.
 *
 * @param {BlockRecords} records
 * @param {RunContext} run
 * @param {ArenaIndex} index the declaration's index
 */
export function keepBlockEscape(records, run, index) {
  const source = /** @type {TokenListId} */ (
    sourceListOf(declarationAt(records, index))
  );
  const id = withBlockEscape(records, run, index, source);
  if (id !== source) writeValueList(records, run, index, id);
}

/**
 * Keeps the whitespace character that a comment held before its removal, when
 * the comment follows a declaration that ends in a backslash. PostCSS keeps
 * that character in the comment's raw before, so the removal would leave the
 * escape to take the next comment or the `}`. The character moves into the
 * value, and a last comment's remaining whitespace into the block's after raw,
 * as `withBlockEscape` does for a declaration.
 *
 * @param {BlockRecords} records
 * @param {RunContext} run
 * @param {ArenaIndex} index a comment, before it is removed
 */
export function keepCommentNewlineEscape(records, run, index) {
  const { links } = records;
  const { before } = records.entry(index);
  if (!before || !cssnanoUtils.isCSSWhitespace(before.charCodeAt(0))) return;
  const prev = links.prevSibling(index);
  if (prev === -1 || records.entry(prev).kind !== DECLARATION) return;
  const parent = /** @type {ArenaIndex} */ (links.parentOf(index));
  const block = /** @type {RuleRecord | BlockRecord} */ (records.entry(parent));
  if (block.kind !== RULE && block.kind !== AT_RULE_BLOCK) return;
  const { important, prop, valueList } = declarationAt(records, prev);
  if (important) return;
  const text = tokensText(run.tokenLists.get(valueList));
  if (!cssnanoUtils.endsWithEscapingBackslash(text)) return;
  if (links.nextSibling(index) === -1) {
    writeAfter(records, parent, before.slice(1) + (block.after ?? ''));
  }
  writeValueList(
    records,
    run,
    prev,
    run.valueIds.idOf(run.tokenLists, tokenizeMode(prop), text + before[0])
  );
}

/**
 * Runs the declaration part of the walk over one declaration record, in
 * document order: its stray semicolon, its comments, the character an escape
 * at the end of its block takes, then its value's fold. A value is written
 * only when its id changes, so a declaration no stage or comment removal
 * changed stays unmarked.
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
  const source = /** @type {TokenListId} */ (
    sourceListOf(declarationAt(records, index))
  );
  let id = source;
  if (comments !== null) {
    removeBetweenComments(records, index, comments);
    id = commentFreeIdOf(run, source, prop, comments);
    removeImportantComments(records, index, comments);
  }
  const escaped = withBlockEscape(records, run, index, id);
  let result =
    entry.plan === null
      ? escaped
      : foldList(entry, escaped, context, run, index);
  if (escaped !== id && result !== escaped) {
    result = withEscapeKept(run, prop, escaped, result);
  }
  if (result !== source) writeValueList(records, run, index, result);
}
