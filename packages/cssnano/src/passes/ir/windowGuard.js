/** @import {TextTable} from '../../values/textTable.js' */

/**
 * The window between build and write-back, under consistency checks: the
 * transforms there read the records, so a read of a table entry means a
 * transform still reads the text the table holds.
 */

const WINDOW_READ = 'a table entry is read between build and write-back';

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
 * Makes each table read of the window throw, and returns a function that
 * restores them.
 *
 * @param {TextTable} textTable
 * @return {() => void} restores the table
 */
export function guardWindow(textTable) {
  for (const name of TABLE_READS) {
    Object.defineProperty(textTable, name, {
      configurable: true,
      value: throwing,
    });
  }
  return () => {
    for (const name of TABLE_READS) Reflect.deleteProperty(textTable, name);
  };
}
