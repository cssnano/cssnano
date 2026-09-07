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

/** @import {Declaration} from 'postcss'; */

/**
 * A border declaration specifies a `<line-width>`, a `<line-style>` and a
 * `<color>` — one of them if it names a component, one of each per side
 * otherwise — and the browser ignores it when a value is none of these.
 *
 * @param {Declaration} declaration one of `allPhysicalBorderProperties`
 * @return {boolean} whether the declaration sets anything at all
 */
function browserKeeps(declaration) {
  const prop = declaration.prop.toLowerCase();

  if (borderAndSideShorthands.has(prop)) {
    return specifiesDistinctComponents(declaration.value);
  }

  const component = /** @type {string} */ (prop.split('-').at(-1));

  if (!allSidesBorderShorthands.includes(prop)) {
    return specifiesComponent(declaration.value, component);
  }

  /* `parseTrbl` takes the four sides it needs and says nothing about a fifth,
   * which is a token that costs the declaration its meaning. */
  if (list.space(declaration.value).length > spec.sides.length) {
    return false;
  }

  return parseTrbl(declaration.value).every((value) =>
    specifiesComponent(value, component)
  );
}

/**
 * @param {import('postcss').Rule} rule
 * @return {boolean}
 */
export function containsUnmergeableBorderDecls(rule) {
  const declarations = /** @type {Declaration[]} */ (
    rule.nodes.filter((node) => node.type === 'decl')
  );

  if (
    declarations.some((declaration) => {
      const prop = declaration.prop.toLowerCase();

      return (
        borderImageProperties.has(prop) ||
        spec.flowRelativeBorderProperties.has(prop)
      );
    })
  ) {
    return true;
  }

  const physical = declarations.filter((declaration) =>
    allPhysicalBorderProperties.has(declaration.prop.toLowerCase())
  );

  if (
    physical.some(
      (declaration) =>
        cssGlobalKeywords.has(declaration.value.toLowerCase()) ||
        ((borderAndSideShorthands.has(declaration.prop.toLowerCase()) ||
          allSidesBorderShorthands.includes(declaration.prop.toLowerCase())) &&
          isCustomProp(declaration))
    )
  ) {
    return true;
  }

  /* A declaration the browser ignores sets nothing, so the ones around it mean
   * what they would mean on their own. Every transform here reads it as one
   * that applies, and would move, ignore or rewrite those others against a
   * border no side ever has. */
  if (physical.some((declaration) => !browserKeeps(declaration))) {
    return true;
  }

  const globalComponents = physical.filter((decl) =>
    allSidesBorderShorthands.includes(decl.prop.toLowerCase())
  );
  const directionalDeclarations = physical.filter((decl) =>
    directionalPhysicalProperties.has(decl.prop.toLowerCase())
  );

  return globalComponents.length > 1 && directionalDeclarations.length > 0;
}

/**
 * @param {import('postcss').Node} node
 * @return {boolean}
 */
function establishesBorderReset(node) {
  if (node.type !== 'decl') {
    return false;
  }

  const declaration = /** @type {Declaration} */ (node);

  if (
    declaration.prop.toLowerCase() !== 'border' ||
    !canExplode(declaration) ||
    stylehacks.detect(declaration)
  ) {
    return false;
  }

  return (
    specifiesDistinctComponents(declaration.value) &&
    isValidWidthStyleColor(parseWidthStyleColor(declaration.value))
  );
}

/**
 * @param {import('postcss').Rule} rule
 * @return {boolean}
 */
export function hasBorderResetContext(rule) {
  return borderResetRules.has(rule) || rule.nodes.some(establishesBorderReset);
}

export { establishesBorderReset };
