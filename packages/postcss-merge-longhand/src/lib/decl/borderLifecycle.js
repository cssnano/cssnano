import { list } from 'postcss';
import stylehacks from 'stylehacks';
import insertCloned from '../insertCloned.js';
import parseTrbl from '../parseTrbl.js';
import getDecls from '../getDecls.js';
import minifyTopBottoRightLeft from '../minifyTrbl.js';
import minifyWidthStyleColor from '../minifyWsc.js';
import canMerge from '../canMerge.js';
import topRightBottomLeft from '../trbl.js';
import isCustomProp from '../isCustomProp.js';
import { isFallback, strandsFallback, inheritSupport } from '../isFallback.js';
import canExplode from '../canExplode.js';
import parseWidthStyleColor from '../parseWsc.js';
import spec from '../spec.js';
import { isValidWidthStyleColor } from '../validateWsc.js';
import cleanupDeclarations from '../cleanupDeclarations.js';
import {
  allPhysicalBorderProperties,
  borderAndSideShorthands,
  borderProperty,
  borderResetRules,
  defaultBorderValues,
  physicalBorderShorthands,
  widthStyleColor,
  getLevel,
} from './borderData.js';
import { diffingProps } from './borderPredicates.js';
import {
  containsUnmergeableBorderDecls,
  establishesBorderReset,
} from './borderValidation.js';

/** @import {Declaration} from 'postcss'; */

const borderSpacing = 'border-spacing';

/**
 * `insertCloned` records the support a new node inherits, but these
 * merges place their node themselves; a clone postcss makes carries the value
 * and not the provenance, so it has to be recorded here too.
 *
 * @param {Declaration} source
 * @param {Partial<import('postcss').DeclarationProps>} props
 * @return {Declaration}
 */
export function cloneWithSupport(source, props) {
  const clone = Object.assign(source.clone(), props);

  inheritSupport(source, clone);

  return clone;
}

/**
 * @param {{values: [string, string, string], nextValues: [string, string, string], decl: Declaration, nextDecl: Declaration, index: number}} arg
 * @return {void}
 */
export function mergeRedundant({ values, nextValues, decl, nextDecl, index }) {
  if (!canMerge([decl, nextDecl])) {
    return;
  }

  if (stylehacks.detect(decl) || stylehacks.detect(nextDecl)) {
    return;
  }

  const diff = diffingProps(values, nextValues, widthStyleColor);

  if (diff.length !== 1) {
    return;
  }

  const prop = /** @type {string} */ (diff.pop());
  const position = widthStyleColor.indexOf(prop);

  const prop1 = `${nextDecl.prop}-${prop}`;
  const prop2 = `border-${prop}`;

  const props = parseTrbl(values[position]);

  props[index] = nextValues[position];

  const borderValue2 = values.filter((e, i) => i !== position).join(' ');
  const propValue2 = minifyTopBottoRightLeft(props);

  const origLength = (
    minifyWidthStyleColor(decl.value) +
    nextDecl.prop +
    nextDecl.value
  ).length;
  const newLength1 =
    decl.value.length +
    prop1.length +
    minifyWidthStyleColor(nextValues[position]).length;
  const newLength2 = borderValue2.length + prop2.length + propValue2.length;

  if (newLength1 < newLength2 && newLength1 < origLength) {
    nextDecl.prop = prop1;
    nextDecl.value = nextValues[position];
  }

  if (newLength2 < newLength1 && newLength2 < origLength) {
    decl.value = borderValue2;
    nextDecl.prop = prop2;
    nextDecl.value = propValue2;
  }
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
export function mergeBorderSpacing(rule) {
  rule.walkDecls((decl) => {
    if (decl.prop.toLowerCase() !== borderSpacing) {
      return;
    }

    const value = list.space(decl.value);

    if (value.length > 1 && value[0] === value[1]) {
      decl.value = value.slice(1).join(' ');
    }
  });
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
export function cleanup(rule) {
  rule.walkDecls((decl) => {
    if (borderAndSideShorthands.has(decl.prop.toLowerCase())) {
      decl.value = minifyWidthStyleColor(decl.value);
    }
  });

  const decls = getDecls(rule, allPhysicalBorderProperties);

  cleanupDeclarations(decls, (node, lastNode) => {
    const lastPart = lastNode.prop.split('-').pop();

    return (
      !isCustomProp(lastNode) &&
      !strandsFallback(node, lastNode) &&
      /** @type {number} */ (getLevel(node.prop)) >
        /** @type {number} */ (getLevel(lastNode.prop)) &&
      (node.prop.toLowerCase().includes(lastNode.prop) ||
        node.prop.toLowerCase().endsWith(/** @type {string} */ (lastPart)))
    );
  });
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
export function explode(rule) {
  if (rule.nodes.some(establishesBorderReset)) {
    borderResetRules.add(rule);
  }

  if (containsUnmergeableBorderDecls(rule)) {
    return;
  }

  rule.walkDecls((decl) => {
    if (!spec.borderProperties.has(decl.prop.toLowerCase())) {
      return;
    }

    if (!canExplode(decl)) {
      return;
    }

    if (stylehacks.detect(decl)) {
      return;
    }

    const prop = decl.prop.toLowerCase();

    // border -> border-trbl
    if (prop === 'border') {
      if (isValidWidthStyleColor(parseWidthStyleColor(decl.value))) {
        for (const direction of physicalBorderShorthands) {
          insertCloned(
            /** @type {import('postcss').Rule} */ (decl.parent),
            decl,
            { prop: direction }
          );
        }

        decl.remove();
      }
    }

    // border-trbl -> border-trbl-wsc
    if (physicalBorderShorthands.some((direction) => prop === direction)) {
      const values = parseWidthStyleColor(decl.value);

      if (isValidWidthStyleColor(values)) {
        for (const [i, d] of widthStyleColor.entries()) {
          insertCloned(
            /** @type {import('postcss').Rule} */ (decl.parent),
            decl,
            {
              prop: `${prop}-${d}`,
              value: values[i] || defaultBorderValues[i],
            }
          );
        }

        decl.remove();
      }
    }

    // border-wsc -> border-trbl-wsc
    widthStyleColor.some((style) => {
      if (prop !== borderProperty(style)) {
        return false;
      }

      if (isCustomProp(decl)) {
        decl.prop = decl.prop.toLowerCase();
        return false;
      }
      for (const [i, value] of parseTrbl(decl.value).entries()) {
        insertCloned(
          /** @type {import('postcss').Rule} */ (decl.parent),
          decl,
          {
            prop: borderProperty(topRightBottomLeft[i], style),
            value,
          }
        );
      }

      return decl.remove();
    });
  });
}

/**
 * `border`, `border-<side>` and `border-<component>` all reach a side's
 * component without naming it, so the last declaration to set one side's
 * component is not always the longhand that specifies it, and if they follow
 * a longhand, they override the value set by the longhand.
 *
 * @param {import('postcss').ChildNode[]} nodes the nodes preceding the merge
 * @param {string} side one of `topRightBottomLeft`
 * @param {string} component one of `widthStyleColor`
 * @return {Declaration | undefined} the longhand the side's component comes
 * from, when a longhand is where it comes from
 */
export function specifiedBy(nodes, side, component) {
  const longhand = borderProperty(side, component);
  const setters = new Set([
    'border',
    borderProperty(side),
    borderProperty(component),
    longhand,
  ]);
  /** @type {Declaration | undefined} */
  let last;

  for (const node of nodes) {
    const { type } = node;

    if (type !== 'decl' || !node.parent) {
      continue;
    }

    if (setters.has(node.prop.toLowerCase())) {
      last = node;
    }
  }

  return last && last.prop.toLowerCase() === longhand ? last : undefined;
}

/**
 * When a merge inserts at a range's start, later declarations for the same
 * property remain. Those that are fallbacks or hacks must stay; others can be
 * subsumed. Returns undefined if any repeat must be preserved.
 *
 * @param {import('postcss').Rule} rule
 * @param {Declaration} start merge insertion point
 * @param {Declaration[]} chosen declarations being merged, one per property
 * @return {Declaration[] | undefined} repeats that can safely be removed
 */
export function subsumedAfter(rule, start, chosen) {
  /** @type {Map<string, Declaration>} */
  const wanted = new Map(chosen.map((node) => [node.prop.toLowerCase(), node]));
  const from = rule.index(start);
  /** @type {Declaration[]} */
  const subsumed = [];

  for (const node of rule.nodes) {
    const { type } = node;

    if (type !== 'decl') {
      continue;
    }

    const last = wanted.get(node.prop.toLowerCase());

    if (last === undefined) {
      continue;
    }

    const at = rule.index(node);

    if (at <= from || at > rule.index(last)) {
      continue;
    }

    /* A repeat the browsers that skip the one it repeats still keep is a
     * fallback the author wrote, not a leftover. */
    if (node !== last && (isFallback(node, last) || stylehacks.detect(node))) {
      return undefined;
    }

    subsumed.push(node);
  }

  return subsumed;
}
