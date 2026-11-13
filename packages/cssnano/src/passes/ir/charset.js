import {
  AT_RULE_BLOCK,
  AT_RULE_STATEMENT,
  COMMENT,
  DECLARATION,
  RULE,
} from './blockRecord.js';
import { placeStatementBefore } from './arenaEdits.js';
import { writeBefore, writeLeadingWhitespace } from './rawEdits.js';
import { remove } from './treeEdits.js';
import { tokensText } from '../../values/tokensText.js';
import { holdsNonAscii } from '../../values/nonAscii.js';

/** @import {BlockRecords} from './blockRecords.js' */
/** @import {ArenaIndex} from './blockRecord.js' */
/** @import {RunContext} from './runContext.js' */
/** @import {TokenListId} from './tokenLists.js' */

const CHARSET = 'charset';
/** The scan's index for no entry. */
const NONE = /** @type {ArenaIndex} */ (-1);

/**
 * What the charset decision reads from a walk: the first `@charset`, every
 * top-level `@charset` in visit order, and the first top-level entry with
 * non-ASCII text, each an arena index or -1 for none. `candidates`, when set,
 * records every such entry, for a run whose transforms may remove that text
 * after the walk.
 *
 * @typedef {object} CharsetScan
 * @property {ArenaIndex} first
 * @property {ArenaIndex[]} charsets
 * @property {ArenaIndex} nonAscii
 * @property {ArenaIndex[]} [candidates]
 */

/**
 * @param {boolean} [keepCandidates] whether to record every entry with non-ASCII text
 * @return {CharsetScan}
 */
export function createCharsetScan(keepCandidates = false) {
  return {
    first: NONE,
    charsets: [],
    nonAscii: NONE,
    candidates: keepCandidates ? [] : undefined,
  };
}

/**
 * @param {RunContext} context
 * @param {TokenListId} id
 * @return {boolean}
 */
function listHoldsNonAscii(context, id) {
  return holdsNonAscii(tokensText(context.tokenLists.get(id)));
}

/**
 * Whether the text of one entry, apart from its children, is non-ASCII: names,
 * value and prelude lists, comment text and the spellings the record holds.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {ArenaIndex} index
 * @return {boolean}
 */
function ownTextHoldsNonAscii(records, context, index) {
  const record = records.entry(index);
  /** @type {(string | null | undefined)[]} */
  let spellings;
  switch (record.kind) {
    case DECLARATION:
      if (!record.marked && record.writtenNonAscii) return true;
      if (listHoldsNonAscii(context, record.valueList)) return true;
      spellings = [record.prop, record.between, record.importantSpelling];
      break;
    case RULE:
      if (record.selectorIds.some((id) => listHoldsNonAscii(context, id))) {
        return true;
      }
      spellings = [record.between, record.after];
      break;
    case AT_RULE_BLOCK:
    case AT_RULE_STATEMENT:
      if (
        listHoldsNonAscii(
          context,
          /** @type {TokenListId} */ (record.preludeId)
        )
      )
        return true;
      spellings = [record.name, record.afterName, record.between];
      if (record.kind === AT_RULE_BLOCK) spellings.push(record.after);
      break;
    case COMMENT:
      spellings = [record.text];
      break;
    default:
      return false;
  }
  return spellings.some((text) => text != null && holdsNonAscii(text));
}

/**
 * Whether an entry or any entry below it holds non-ASCII text. Stops at the
 * first hit.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {ArenaIndex} index
 * @return {boolean}
 */
export function entryHoldsNonAscii(records, context, index) {
  if (ownTextHoldsNonAscii(records, context, index)) return true;
  const { links } = records;
  for (
    let child = links.firstChild(index);
    child !== -1;
    child = links.nextSibling(child)
  ) {
    if (entryHoldsNonAscii(records, context, child)) return true;
  }
  return false;
}

/**
 * Records what the charset decision needs from one entry. A nested `@charset`
 * is removed as it is visited, so a walk that discards empty containers after
 * their children also discards one that held only a charset.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {ArenaIndex} index
 * @param {CharsetScan} scan
 * @return {void}
 */
export function charsetVisit(records, context, index, scan) {
  const record = records.entry(index);
  const isTop = records.links.parentOf(index) === records.root.index;
  if (
    (record.kind === AT_RULE_STATEMENT || record.kind === AT_RULE_BLOCK) &&
    record.name === CHARSET
  ) {
    if (scan.first === -1) scan.first = index;
    if (isTop) {
      scan.charsets.push(index);
    } else {
      remove(records, index);
    }
  } else if (
    (scan.nonAscii === -1 || scan.candidates) &&
    isTop &&
    entryHoldsNonAscii(records, context, index)
  ) {
    if (scan.nonAscii === -1) scan.nonAscii = index;
    scan.candidates?.push(index);
  }
}

/**
 * Finds the first candidate that is still at the top and still has non-ASCII
 * text, once the transforms after the walk have removed what they remove.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {CharsetScan} scan
 * @return {void}
 */
export function rescanNonAscii(records, context, scan) {
  scan.nonAscii =
    scan.candidates?.find(
      (index) =>
        records.links.parentOf(index) === records.root.index &&
        entryHoldsNonAscii(records, context, index)
    ) ?? NONE;
}

/**
 * Removes the top-level charsets. A stylesheet with non-ASCII text keeps the
 * first charset at the top, or adds one when `add` is not false. The new
 * entry takes the first charset's prelude and spellings, and the template of
 * the first entry with non-ASCII text, whose source its node takes. The
 * separator after the first charset is read before the removal.
 *
 * @param {BlockRecords} records
 * @param {RunContext} context
 * @param {CharsetScan} scan
 * @param {{add?: boolean}} opts
 * @return {void}
 */
export function decideCharset(records, context, scan, opts) {
  const { links, root } = records;
  const { first, charsets, nonAscii } = scan;
  const firstIsHead = first !== -1 && first === links.firstChild(root.index);
  const next = firstIsHead ? links.nextSibling(first) : -1;
  const separator = next === -1 ? null : records.entry(next).before;
  // The first charset prints the stylesheet's leading whitespace when it leads.
  let firstBefore = null;
  if (firstIsHead) firstBefore = records.leadingWhitespace;
  else if (first !== -1) firstBefore = records.entry(first).before;
  for (const index of charsets) remove(records, index);
  if (nonAscii === -1) return;
  if (first === -1 && opts.add === false) return;

  const oldHead = /** @type {ArenaIndex} */ (links.firstChild(root.index));
  const afterHead = links.nextSibling(oldHead);
  const kept =
    first === -1
      ? undefined
      : /** @type {import('./blockRecord.js').NodeEntry} */ (
          records.entry(first)
        );
  const template = records.entry(nonAscii).template;
  placeStatementBefore(records, oldHead, {
    name: CHARSET,
    preludeId:
      kept && kept.preludeId !== -1
        ? /** @type {TokenListId} */ (kept.preludeId)
        : context.valueIds.idOf(context.tokenLists, undefined, '"utf-8"'),
    before: firstBefore,
    between: kept?.between ?? null,
    afterName: kept?.afterName ?? null,
    template: /** @type {ArenaIndex} */ (template === -1 ? nonAscii : template),
  });
  writeLeadingWhitespace(records, firstBefore);
  // The old head follows the charset: it takes the separator, else the
  // whitespace of the entry after it, which may be none.
  const following =
    separator ?? (afterHead === -1 ? null : records.entry(afterHead).before);
  writeBefore(records, oldHead, following);
}
