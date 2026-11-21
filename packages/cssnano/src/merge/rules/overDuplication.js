import { firstDeclaration, nextDeclaration } from '../../ir/blockChildren.js';
import {
  AT_RULE_BLOCK,
  DECLARATION,
  RULE,
  STYLESHEET,
} from '../../ir/blockRecord.js';

/** @import {BlockRecords} from '../../ir/blockRecords.js' */
/** @import {BlockRecord} from '../../ir/blockRecord.js' */
/** @import {RuleRecord} from '../../ir/ruleRecord.js' */
/** @import {DeclarationRecord} from '../../ir/declarationRecord.js' */

const TWICE = 'the records reach a node twice';
const OVER_WRITTEN =
  'a declaration is written more often than the input wrote it';

/**
 * The key by which a declaration is counted: its property, value list and
 * `!important` flag, so a copy of a declaration counts as the same one.
 *
 * @param {DeclarationRecord} record
 * @return {string}
 */
function declarationKey(record) {
  return JSON.stringify([record.prop, record.valueList, record.important]);
}

/**
 * Counts the declarations that the records hold by key: those of each rule that
 * holds no block, and each declaration that is a child of a block. Under
 * consistency checks, throws when a node is reached twice.
 *
 * @param {BlockRecords} records
 * @return {Map<string, number>}
 */
export function tallyDeclarations(records) {
  const tally = new DeclarationTally(records);
  tally.walk(records.root);
  return tally.written;
}

/** The entries reached and the declarations counted by one walk. */
class DeclarationTally {
  /** @param {BlockRecords} records */
  constructor(records) {
    this.records = records;
    /** @type {Set<number>} the arena indices of the entries the records reach */
    this.reached = new Set();
    /** @type {Map<string, number>} */
    this.written = new Map();
  }

  /** @param {number} index */
  reach(index) {
    if (this.reached.has(index)) throw new Error(TWICE);
    this.reached.add(index);
  }

  /** @param {DeclarationRecord} declaration */
  count(declaration) {
    const key = declarationKey(declaration);
    this.written.set(key, (this.written.get(key) ?? 0) + 1);
  }

  /** @param {RuleRecord} record */
  visitRule(record) {
    const { records } = this;
    this.reach(record.index);
    if (record.context !== -1) {
      this.walk(record);
      return;
    }
    for (
      let declaration = firstDeclaration(records, record.index);
      declaration !== undefined;
      declaration = nextDeclaration(records, declaration)
    ) {
      this.count(declaration);
    }
  }

  /** @param {BlockRecord | RuleRecord} block the block, or the rule that nests */
  walk(block) {
    const { links } = this.records;
    for (
      let entry = links.firstChild(block.index);
      entry !== -1;
      entry = links.nextSibling(entry)
    ) {
      const item = this.records.entry(entry);
      if (item.kind === RULE) {
        this.visitRule(item);
      } else if (item.kind === STYLESHEET || item.kind === AT_RULE_BLOCK) {
        this.reach(entry);
        this.walk(item);
      } else {
        this.reach(entry);
        if (item.kind === DECLARATION) this.count(item);
      }
    }
  }
}

/**
 * Under consistency checks, throws when the records reach a node twice, or hold
 * a declaration more often than the input wrote it. The sweeps and joins only
 * move and rewrite rules, so no declaration is written again.
 *
 * @param {BlockRecords} records
 * @param {Map<string, number> | null} input the tally of the input, or null when none was taken
 * @return {void}
 */
export function assertNoOverDuplication(records, input) {
  if (!records.consistencyChecks) return;
  const written = tallyDeclarations(records);
  if (input === null) return;
  for (const [key, count] of written) {
    if (count > (input.get(key) ?? 0)) throw new Error(OVER_WRITTEN);
  }
}
