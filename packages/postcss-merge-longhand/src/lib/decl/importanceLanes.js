import cssnanoUtils from 'cssnano-utils';
import { declarationRuns } from './declarationRuns.js';

/** @import {Container, Declaration} from 'postcss'; */

const { TokenType, decoded, tokens } = cssnanoUtils;

/**
 * Property names are CSS identifiers, so engines match their decoded
 * spelling: `\61 ll` is `all`. A malformed name matches no property.
 *
 * @param {string} prop - a name containing an escape
 * @return {string | undefined}
 */
export function decodedPropertyName(prop) {
  const propertyTokens = tokens(prop);
  const [property] = propertyTokens;
  if (propertyTokens.length !== 1 || property?.[0] !== TokenType.Ident) {
    return undefined;
  }
  return decoded(property).toLowerCase();
}

/**
 * @param {Declaration} declaration
 * @return {boolean}
 */
export function isAll(declaration) {
  const prop = declaration.prop;
  if (prop.length === 3 && prop.toLowerCase() === 'all') return true;
  return prop.includes('\\') && decodedPropertyName(prop) === 'all';
}

/**
 * Reconstruct the normal and important lanes in rule order. A matching `all`
 * declaration is retained only as a segment boundary for family reducers.
 *
 * @param {Container} rule
 * @param {Declaration[]} declarations
 * @return {[Declaration[], Declaration[]]}
 */
export function importanceLanes(rule, declarations) {
  const live = declarations.filter((d) => d.parent === rule);
  /** @type {[Declaration[], Declaration[]]} */
  const lanes = [[], []];

  if (!rule.nodes?.some((n) => n.type === 'decl' && isAll(n))) {
    for (const node of live) {
      lanes[node.important ? 1 : 0].push(node);
    }
    return lanes;
  }

  // Another run of the same rule cannot be overridden by or override these.
  const liveSet = new Set(live);
  const scope = declarationRuns(rule)
    .filter((run) => run.some((d) => liveSet.has(d)))
    .flat();

  for (const node of scope) {
    if (liveSet.has(node) || isAll(node)) {
      lanes[node.important ? 1 : 0].push(node);
    }
  }

  return lanes;
}

/**
 * Apply declaration cleanup independently between matching `all` boundaries.
 *
 * @param {Declaration[][]} lanes
 * @param {(declarations: Set<Declaration>) => void} cleanup
 */
export function cleanupLaneSegments(lanes, cleanup) {
  for (const lane of lanes) {
    /** @type {Declaration[]} */
    let segment = [];
    for (const declaration of lane) {
      if (isAll(declaration)) {
        if (segment.length > 1) cleanup(new Set(segment));
        segment = [];
      } else {
        segment.push(declaration);
      }
    }
    if (segment.length > 1) cleanup(new Set(segment));
  }
}
