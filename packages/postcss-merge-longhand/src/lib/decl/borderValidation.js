import { list } from 'postcss';
import stylehacks from 'stylehacks';
import parseTrbl from '../parseTrbl.js';
import isCustomProp from '../isCustomProp.js';
import canExplode from '../canExplode.js';
import parseWidthStyleColor from '../parseWsc.js';
import cssGlobalKeywords from '../cssGlobalKeywords.js';
import spec from '../spec.js';
import {
  allPhysicalBorderProperties,
  allSidesBorderShorthands,
  borderAndSideShorthands,
  borderImageProperties,
  borderResetRules,
  directionalPhysicalProperties,
} from './borderData.js';
import {
  isValidWidthStyleColor,
  specifiesComponent,
  specifiesDistinctComponents,
} from '../validateWsc.js';

/** @import {Declaration, Rule, Node} from 'postcss'; */

/**
 * @param {Declaration} declaration one of `allPhysicalBorderProperties`
 * @return {boolean}
 */
export function browserKeeps(declaration) {
  const prop = declaration.prop.toLowerCase();
  if (borderAndSideShorthands.has(prop)) {
    return specifiesDistinctComponents(declaration.value);
  }
  const component = /** @type {string} */ (prop.split('-').at(-1));
  if (!allSidesBorderShorthands.includes(prop)) {
    return specifiesComponent(declaration.value, component);
  }
  if (list.space(declaration.value).length > spec.sides.length) return false;
  return parseTrbl(declaration.value).every((v) =>
    specifiesComponent(v, component)
  );
}

/**
 * @param {Rule} rule
 * @return {boolean}
 */
export function containsUnmergeableBorderDecls(rule) {
  const decls = /** @type {Declaration[]} */ (
    rule.nodes.filter((n) => n.type === 'decl')
  );
  if (
    decls.some((d) => {
      const p = d.prop.toLowerCase();
      return (
        borderImageProperties.has(p) || spec.flowRelativeBorderProperties.has(p)
      );
    })
  ) {
    return true;
  }

  const physical = decls.filter((d) =>
    allPhysicalBorderProperties.has(d.prop.toLowerCase())
  );
  if (
    physical.some((d) => {
      const p = d.prop.toLowerCase();
      const isCustom =
        (borderAndSideShorthands.has(p) ||
          allSidesBorderShorthands.includes(p)) &&
        isCustomProp(d);
      return (
        cssGlobalKeywords.has(d.value.toLowerCase()) ||
        isCustom ||
        !browserKeeps(d)
      );
    })
  ) {
    return true;
  }

  const globalComps = physical.filter((d) =>
    allSidesBorderShorthands.includes(d.prop.toLowerCase())
  );
  const directional = physical.filter((d) =>
    directionalPhysicalProperties.has(d.prop.toLowerCase())
  );
  return globalComps.length > 1 && directional.length > 0;
}

/**
 * @param {Node} node
 * @return {boolean}
 */
function establishesBorderReset(node) {
  if (node.type !== 'decl') return false;
  const d = /** @type {Declaration} */ (node);
  if (
    d.prop.toLowerCase() !== 'border' ||
    !canExplode(d) ||
    stylehacks.detect(d)
  )
    return false;
  return (
    specifiesDistinctComponents(d.value) &&
    isValidWidthStyleColor(parseWidthStyleColor(d.value))
  );
}

/**
 * @param {Rule} rule
 * @return {boolean}
 */
export function hasBorderResetContext(rule) {
  return borderResetRules.has(rule) || rule.nodes.some(establishesBorderReset);
}

export { establishesBorderReset };
