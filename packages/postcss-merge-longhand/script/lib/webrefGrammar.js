import {
  REFERENCE,
  keywordTerminals as readKeywordTerminals,
} from '../../../../util/webref/webref.js';
/** @import {WebrefData, WebrefDefinition} from './webrefLonghands.js'; */

/**
 * Reads a webref grammar for the terminals the plugin classifies values by:
 * the literal keywords a production offers and the functions it can reach.
 * Kept free of I/O so that it can be unit tested.
 */

/**
 * The keywords a grammar offers as literal alternatives, such as the line
 * styles of `<line-style>`. A name spelled out with an argument list is a
 * function rather than a keyword.
 *
 * @param {string} [syntax]
 * @return {string[]}
 */
export const keywordTerminals = (syntax) =>
  readKeywordTerminals(syntax).map((keyword) => keyword.toLowerCase());

/**
 * A grammar may spell a function out as a call instead of naming it through a
 * `<name()>` reference: the syntax of `<light-dark-color>` is
 * `light-dark(<color>, <color>)`, so following references alone never reaches
 * `light-dark()`. This reads the functions spelled out that way.
 *
 * @param {string} [syntax]
 * @return {string[]}
 */
function functionTerminals(syntax) {
  if (!syntax) {
    return [];
  }

  const literals = syntax.replace(REFERENCE, ' ');
  /** @type {string[]} */
  const names = [];

  for (const [, name] of literals.matchAll(/([a-zA-Z][a-zA-Z0-9\-]*)\s*\(/gv)) {
    names.push(name.toLowerCase());
  }

  return names;
}

/**
 * Follows a grammar through the productions it names, collecting the functions
 * it can reach. `<color>` reaches `rgb()` through `<color-base>` and
 * `<color-function>`, so a value is a colour if it calls any of them.
 *
 * The walk stops at each function it reaches, because what a function takes is
 * not what it produces: `<color>` names `<contrast-color()>`, whose arguments
 * name `<wcag2>`, and a contrast ratio is no colour. Only the alternatives a
 * production offers stand in its own place.
 *
 * @param {WebrefData} data
 * @param {string} root Name of the type to start from, without its brackets.
 * @return {string[]}
 */
export function reachableFunctions(data, root) {
  /** @type {Map<string, WebrefDefinition>} */
  const definitions = new Map();
  for (const definition of [...data.types, ...data.functions]) {
    definitions.set(definition.name, definition);
  }

  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {Set<string>} */
  const functions = new Set();
  /** @type {string[]} */
  const queue = [root];

  while (queue.length) {
    const name = /** @type {string} */ (queue.pop());

    if (seen.has(name)) {
      continue;
    }

    seen.add(name);

    const syntax = definitions.get(name)?.syntax;

    if (name.endsWith('()')) {
      functions.add(name.slice(0, -2).toLowerCase());

      /* A function's own grammar is the call, and the name it spells is not
       * always the name the definition carries: css-color-hdr defines
       * `hdr-color()` as `color-hdr(…)`, and the stylesheet writes the
       * latter. Nothing deeper counts, since arguments are not results. */
      const [, call] = /^\s*([\w\-]+)\(/v.exec(syntax ?? '') ?? [];

      if (call) {
        functions.add(call.toLowerCase());
      }

      continue;
    }

    if (!syntax) {
      continue;
    }

    for (const called of functionTerminals(syntax)) {
      functions.add(called);
    }

    for (const [, property, type] of syntax.matchAll(REFERENCE)) {
      // A property's own grammar leads back into properties rather than types.
      if (property === undefined) {
        queue.push(type);
      }
    }
  }

  return [...functions].toSorted();
}
