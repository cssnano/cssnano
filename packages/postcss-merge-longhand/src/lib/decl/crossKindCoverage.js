import cssnanoUtils from 'cssnano-utils';
import stylehacks from 'stylehacks';
import { detach } from '../deferredChildEdits.js';
import { isFallback, needsUnmetSupport } from '../isFallback.js';
import { boxProperties, writingModes } from './boxGroups.js';
import { isAll } from './importanceLanes.js';
import { candidateLimit } from './overriddenDeclarations.js';

const { asciiLowerCase } = cssnanoUtils;

/** @import {Declaration} from 'postcss'; */
/** @import {BoxProperty} from './boxGroups.js'; */

const cellCount = writingModes.length * 4;

/**
 * @param {Declaration} declaration
 * @param {BoxProperty} property - the property of the declaration
 * @param {Uint8Array} plain - the cells a later declaration that every target
 * parses sets
 * @param {(Declaration | BoxProperty)[][]} others - per cell, later
 * declarations with their properties
 * @param {import('../targetSupport.js').BoxSupport} support
 * @return {boolean} whether later declarations set every cell of the
 * declaration, without leaving it to apply in any target
 */
function coversEveryCell(declaration, property, plain, others, support) {
  for (const cell of property.cells) {
    if (plain[cell] === 1) continue;
    const candidates = others[cell];
    let covered = false;
    if (candidates !== undefined) {
      for (let at = 0; at < candidates.length && !covered; at += 2) {
        covered =
          !isFallback(
            declaration,
            /** @type {Declaration} */ (candidates[at])
          ) &&
          support.understandsWherever(
            property,
            /** @type {BoxProperty} */ (candidates[at + 1])
          );
      }
    }
    if (!covered) return false;
  }
  return true;
}

/**
 * Drops declarations that later ones override on every side in every
 * `writing-mode` and `direction`, since flow-relative and physical properties
 * alias each other. A later declaration does not count when the earlier is
 * its fallback, or when some target understands the earlier but not the later.
 *
 * @param {Declaration[]} lane - one importance lane of a group in source
 * order; barriers that belong to no family are skipped
 * @param {import('../targetSupport.js').BoxSupport} support
 * @return {void}
 */
export function discardDeadDeclarations(lane, support) {
  const plain = new Uint8Array(cellCount);
  /* Per cell, the later declarations that may cover it, each followed by its
   * property so the check looks neither up. */
  /** @type {(Declaration | BoxProperty)[][]} */
  let others = [];

  for (let index = lane.length - 1; index >= 0; index--) {
    const declaration = lane[index];
    if (declaration.parent === undefined) continue;
    if (isAll(declaration)) {
      plain.fill(0);
      others = [];
      continue;
    }
    const property = boxProperties.get(asciiLowerCase(declaration.prop));
    if (property === undefined || stylehacks.detect(declaration)) continue;
    const { cells } = property;
    const isCovered = coversEveryCell(
      declaration,
      property,
      plain,
      others,
      support
    );
    if (isCovered) {
      detach(declaration);
    } else if (
      !needsUnmetSupport(declaration) &&
      support.supportsAll(property.name)
    ) {
      for (const cell of cells) plain[cell] = 1;
    } else {
      for (const cell of cells) {
        const candidates = (others[cell] ??= []);
        if (candidates.length < candidateLimit * 2) {
          candidates.push(declaration, property);
        }
      }
    }
  }
}
