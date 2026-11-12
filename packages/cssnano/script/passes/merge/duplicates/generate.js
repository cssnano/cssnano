import { random } from '../../../../../../util/fuzzRng.js';

/** @import {AnyNode} from 'postcss' */

// The pieces the stylesheets draw from. Each group holds the spellings the
// dedupe must tell apart or equate. `ALT` repeats the shapes of `BASE` with
// other names, so a sibling pair drawn with both differs in one place only.
const BASE = Object.freeze({
  // `a,b`, `a, b` and `a /**/, b` are one selector list spelled three ways.
  selectors: ['a', 'a', 'b', '.c', 'a b', 'a,b', 'a, b', 'a /**/, b'],
  declarations: [
    'color:red',
    'color:red',
    'color:blue',
    'COLOR:red',
    'color:red !important',
    'color:red!IMPORTANT',
    '--Foo:1',
    '--foo:1',
    '--foo:2',
    'zoom:1',
    '*zoom:1',
    'margin:0',
  ],
  comments: ['/*! note */', '/*! other */', '/* plain */', '/* more */'],
  // Statements may be repeated as they are, so each appears twice.
  statements: [
    '@import url(x.css)',
    '@import url(x.css)',
    '@import url(y.css)',
    '@layer c',
    '@foo/*c*/x',
    '@foo x',
  ],
  // Identical preludes share a scope, so equal and different ones both repeat.
  conditions: [
    '@media print',
    '@media print',
    '@media screen',
    '@supports (display:grid)',
    '@container x',
    '@media/*c*/print',
  ],
  // Named layers merge into one, anonymous ones stay apart.
  layers: ['@layer a', '@layer a', '@layer b', '@layer', '@layer/*c*/'],
  other: ['@foo x', '@foo x', '@foo/*c*/x'],
  space: '',
});

const ALT = Object.freeze({
  selectors: ['b', 'a b', '.c'],
  declarations: ['color:blue', 'zoom:2', 'COLOR:blue', '--Foo:2'],
  comments: ['/* z */', '/*! z */'],
  statements: ['@import url(z.css)', '@layer z'],
  conditions: ['@media screen', '@media print'],
  layers: ['@layer z', '@layer'],
  other: ['@foo y', '@foo x'],
  space: '\n  ',
});

// The base pieces with only the selectors changed, so a rule that nests in the
// body differs from its twin by its selector alone.
const SELECTORS_ALT = Object.freeze({ ...BASE, selectors: ALT.selectors });

const WRAPPERS = Object.freeze({
  base: [
    '@media print',
    '@media print',
    '@layer a',
    '@layer',
    '@foo x',
    'a',
    '.c',
  ],
  alt: [
    '@media screen',
    '@layer z',
    '@foo y',
    '@foo/*c*/x',
    'b',
    '@layer/*c*/',
  ],
});

const MAX_DEPTH = 3;

/**
 * @typedef {typeof BASE} Pieces
 */

/**
 * One block of items. Each item is a declaration, a comment, a stray `;`, a
 * statement, a rule or a block at-rule. A rule may nest; a block at-rule
 * holds a block.
 *
 * @param {ReturnType<typeof random>} rnd
 * @param {number} depth
 * @param {Pieces} pieces
 * @return {string}
 */
function items(rnd, depth, pieces) {
  const count = rnd.int(6);
  let css = '';
  for (let i = 0; i < count; i++) {
    css += item(rnd, depth, pieces);
  }
  return css;
}

/**
 * @param {ReturnType<typeof random>} rnd
 * @param {number} depth
 * @param {Pieces} pieces
 * @return {string}
 */
function item(rnd, depth, pieces) {
  const nests = depth < MAX_DEPTH;
  const kind = rnd.int(nests ? 11 : 7);
  switch (kind) {
    case 0:
    case 1:
    case 2:
      // A declaration outside a block is not valid CSS, so the top level takes a comment.
      return depth === 0
        ? rnd.pick(pieces.comments)
        : `${rnd.pick(pieces.declarations)};`;
    case 3:
      return rnd.pick(pieces.comments);
    case 4:
      return ';';
    case 5:
    case 6:
      return `${rnd.pick(pieces.statements)};`;
    case 7:
    case 8:
      return `${rnd.pick(pieces.selectors)}{${items(rnd, depth + 1, pieces)}}`;
    case 9:
      return `${rnd.pick(pieces.conditions)}{${items(rnd, depth + 1, pieces)}}`;
    default:
      return rnd.chance(0.5)
        ? `${rnd.pick(pieces.layers)}{${items(rnd, depth + 1, pieces)}}`
        : `${rnd.pick(pieces.other)}{${items(rnd, depth + 1, pieces)}}`;
  }
}

/**
 * Two sibling blocks drawn from the same random stream, so their bodies have
 * the same shape. The second body takes its pieces from `BASE`, `ALT` or the
 * selectors of `ALT`, and its wrapper may differ from the first in its
 * prelude, its name or the whitespace before it.
 *
 * @param {ReturnType<typeof random>} rnd
 * @return {string}
 */
function siblingPair(rnd) {
  const seed = rnd.int(0x7fffffff) + 1;
  const secondPieces = rnd.pick([BASE, BASE, ALT, SELECTORS_ALT]);
  const first = rnd.pick(WRAPPERS.base);
  const second = rnd.chance(0.5)
    ? first
    : rnd.pick([...WRAPPERS.base, ...WRAPPERS.alt]);
  const space = rnd.chance(0.5) ? ALT.space : BASE.space;
  const firstBody = items(random(seed), 1, BASE);
  const secondBody = items(random(seed), 1, secondPieces);
  return `${first}{${firstBody}}${space}${second}{${secondBody}}`;
}

/**
 * Stylesheets that repeat rules, selectors and declarations across the
 * conditional groups, layers, statements, comments and nesting that the
 * dedupe compares, with sibling pairs that differ in one place.
 *
 * @param {number} seed
 * @param {number} count
 * @return {string[]}
 */
export function generateDuplicateCases(seed, count) {
  const rnd = random(seed);
  return Array.from({ length: count }, () => {
    let css = items(rnd, 0, BASE);
    const pairs = rnd.int(3);
    for (let i = 0; i < pairs; i++) css += siblingPair(rnd);
    return css;
  });
}

/**
 * The structure of a node as the dedupe must compare it: the kind, the names
 * and preludes as written, the trimmed raws it reads, the declaration's
 * property folded to ASCII lower case except for custom properties, and the
 * comment text only for important comments.
 *
 * @param {AnyNode} node
 * @return {unknown[]}
 */
function shapeOf(node) {
  switch (node.type) {
    case 'decl': {
      const prop = node.prop.startsWith('--')
        ? node.prop
        : node.prop.toLowerCase();
      return [
        'decl',
        prop,
        node.value,
        node.important === true,
        node.raws.before?.trim() ?? '',
      ];
    }
    case 'comment':
      return ['comment', node.text.startsWith('!') ? node.text : ''];
    case 'rule':
      return ['rule', node.selector, childShapes(node)];
    case 'atrule':
      return [
        'atrule',
        node.name,
        node.params,
        node.raws.before?.trim() ?? '',
        node.raws.afterName?.trim() ?? '',
        node.nodes ? childShapes(node) : null,
      ];
    default:
      return [node.type];
  }
}

/**
 * @param {{ nodes?: AnyNode[] }} container
 * @return {unknown[] | null}
 */
function childShapes(container) {
  return container.nodes ? container.nodes.map(shapeOf) : null;
}

/**
 * The text that tells two nodes apart in the shape, JSON-encoded so that no
 * two shapes collide.
 *
 * @param {AnyNode} node
 * @return {string}
 */
export function serializeNode(node) {
  return JSON.stringify(shapeOf(node));
}
