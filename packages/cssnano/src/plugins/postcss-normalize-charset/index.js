import { AtRule } from 'postcss';

const charset = 'charset';
// eslint-disable-next-line no-control-regex
const nonAscii = /[^\x00-\x7F]/v;

/**
 * @typedef {object} Options
 * @property {boolean} [add] Adds a `@charset` when the file has non-ASCII characters and no charset. (default: true; the default preset sets false)
 */

/**
 * What the charset decision reads from a walk: the first `@charset`, every
 * top-level `@charset`, in visit order, and the first top-level node with
 * non-ASCII text. `candidates`, when set, records every such node, for a run
 * whose transforms may remove that text after the walk.
 * @typedef {object} CharsetScan
 * @property {import('postcss').AtRule | undefined} first
 * @property {import('postcss').AtRule[]} charsets
 * @property {import('postcss').AnyNode | undefined} nonAscii
 * @property {import('postcss').AnyNode[]} [candidates]
 */

/**
 * Records what the charset decision needs from one node. A nested `@charset`
 * is removed as it is visited, so a walk that discards empty containers after
 * their children also discards one that held only a charset.
 *
 * @param {import('postcss').AnyNode} node
 * @param {CharsetScan} scan
 * @return {void}
 */
export function charsetVisit(node, scan) {
  if (node.type === 'atrule' && node.name === charset) {
    scan.first ??= node;
    if (node.parent?.type === 'root') {
      scan.charsets.push(node);
    } else {
      node.remove();
    }
  } else if (
    (!scan.nonAscii || scan.candidates) &&
    node.parent?.type === 'root' &&
    nonAscii.test(node.toString())
  ) {
    scan.nonAscii ??= node;
    scan.candidates?.push(node);
  }
}

/**
 * Finds the first candidate that is still at the top and still has non-ASCII
 * text, once the transforms after the walk have removed what they remove.
 *
 * @param {CharsetScan} scan
 * @return {void}
 */
export function rescanNonAscii(scan) {
  scan.nonAscii = scan.candidates?.find(
    (node) => node.parent?.type === 'root' && nonAscii.test(node.toString())
  );
}

/**
 * Removes the top-level charsets. A stylesheet with non-ASCII text keeps the
 * first charset at the top, or adds one when `add` is set. The separator
 * after the first charset is read before the removal, from raws the walk
 * already normalized.
 *
 * @param {import('postcss').Root} css
 * @param {CharsetScan} scan
 * @param {Options} opts
 * @return {void}
 */
export function decideCharset(css, scan, opts) {
  const { first, charsets, nonAscii: nonAsciiNode } = scan;
  const separator =
    first && first === css.first ? first.next()?.raws.before : undefined;
  for (const node of charsets) node.remove();
  if (!nonAsciiNode) return;

  /** @type {import('postcss').AtRule | undefined} */
  let charsetRule = first;
  if (!charsetRule) {
    if (opts.add === false) return;
    charsetRule = new AtRule({
      name: charset,
      params: '"utf-8"',
    });
  }
  charsetRule.source = nonAsciiNode.source;
  css.prepend(charsetRule);
  const nextNode = charsetRule.next();
  if (separator !== undefined && nextNode) {
    nextNode.raws.before = separator;
  }
}

/**
 * @param {Options} opts
 * @return {import('postcss').Plugin}
 */
function pluginCreator(opts = {}) {
  return {
    postcssPlugin: 'postcss-normalize-' + charset,

    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      /** @type {CharsetScan} */
      const scan = { first: undefined, charsets: [], nonAscii: undefined };
      css.walk((node) => {
        charsetVisit(node, scan);
      });
      decideCharset(css, scan, opts);
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
