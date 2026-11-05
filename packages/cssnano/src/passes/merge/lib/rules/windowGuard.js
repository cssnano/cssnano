/** @import {ChildNode} from 'postcss' */
/** @import {BlockRecords} from './blockRecords.js' */
/** @import {TextTable} from '../../../../values/textTable.js' */

/**
 * The window between build and write-back, under consistency checks: the
 * transforms there read the records, so a read of a node property or a table
 * entry means a transform still reads the tree.
 */

const WINDOW_READ =
  'a node or table entry is read between build and write-back';

/** Node properties the window must not read, the ones a record holds. */
const NODE_PROPERTIES = [
  'selector',
  'selectors',
  'prop',
  'value',
  'important',
  'name',
  'params',
];

/** Table reads and writes the window must not make. */
const TABLE_READS = [
  'tokens',
  'stored',
  'write',
  'setText',
  'record',
  'share',
  'assignFolded',
];

function throwing() {
  throw new Error(WINDOW_READ);
}

/**
 * Makes each node property and table read of the window throw, and returns a
 * function that restores them. A node keeps its own descriptor, or none when
 * it inherits the property.
 *
 * @param {BlockRecords} records
 * @param {TextTable} textTable
 * @return {() => void} restores the properties and the table
 */
export function guardWindow(records, textTable) {
  /** @type {[ChildNode, string, PropertyDescriptor | undefined][]} */
  const saved = [];
  for (let index = 0; index < records.entryCount(); index++) {
    const node = records.nodeOf(index);
    for (const name of NODE_PROPERTIES) {
      saved.push([node, name, Object.getOwnPropertyDescriptor(node, name)]);
      Object.defineProperty(node, name, {
        configurable: true,
        get: throwing,
        set: throwing,
      });
    }
  }
  for (const name of TABLE_READS) {
    Object.defineProperty(textTable, name, {
      configurable: true,
      value: throwing,
    });
  }
  return () => {
    for (const name of TABLE_READS) Reflect.deleteProperty(textTable, name);
    for (const [node, name, descriptor] of saved.toReversed()) {
      if (descriptor === undefined) Reflect.deleteProperty(node, name);
      else Object.defineProperty(node, name, descriptor);
    }
  };
}
