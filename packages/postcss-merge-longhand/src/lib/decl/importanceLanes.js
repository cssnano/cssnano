import cssnanoUtils from 'cssnano-utils';

/** @import {Declaration, Rule} from 'postcss'; */

const { TokenType, decoded, tokens } = cssnanoUtils;

/**
 * Property names are CSS identifiers, so match their decoded spelling. A
 * malformed property fails closed and cannot become a segment boundary.
 *
 * @param {Declaration} declaration
 * @return {boolean}
 */
export function isAll(declaration) {
  const prop = declaration.prop;
  if (prop.length === 3 && prop.toLowerCase() === 'all') return true;
  if (!prop.includes('\\')) return false;
  const propertyTokens = tokens(prop);
  const [property] = propertyTokens;
  return (
    propertyTokens.length === 1 &&
    property?.[0] === TokenType.Ident &&
    decoded(property).toLowerCase() === 'all'
  );
}

/**
 * Reconstruct the normal and important lanes in rule order. A matching `all`
 * declaration is retained only as a segment boundary for family reducers.
 *
 * @param {Rule} rule
 * @param {Declaration[]} declarations
 * @return {[Declaration[], Declaration[]]}
 */
export function importanceLanes(rule, declarations) {
  const live = declarations.filter((d) => d.parent === rule);
  /** @type {[Declaration[], Declaration[]]} */
  const lanes = [[], []];

  const containsAll = Boolean(
    rule.nodes?.some((n) => n.type === 'decl' && isAll(n))
  );

  if (!containsAll) {
    for (const node of live) {
      lanes[node.important ? 1 : 0].push(node);
    }
    return lanes;
  }

  const liveSet = new Set(live);

  for (const node of rule.nodes ?? []) {
    if (node.type === 'decl') {
      if (liveSet.has(node)) {
        lanes[node.important ? 1 : 0].push(node);
      } else if (isAll(node)) {
        lanes[node.important ? 1 : 0].push(node);
      }
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
