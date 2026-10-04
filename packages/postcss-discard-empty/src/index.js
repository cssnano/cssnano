import cssnanoUtils from 'cssnano-utils';

const { asciiLowerCase, decoded, TokenType, tokens } = cssnanoUtils;

const plugin = 'postcss-discard-empty';

/** CSS-wide keywords are not valid in a `<layer-name>` (CSS Cascade 5). */
const cssWideKeywords = new Set([
  'initial',
  'inherit',
  'unset',
  'revert',
  'revert-layer',
]);

/** Separates path segments in a layer key; no decoded `<ident>` contains it. */
const SEPARATOR = '\0';

/**
 * Builds the key of one `<layer-name>`, `<ident> ['.' <ident>]*`, from its
 * tokens. Whitespace is allowed only around the name, not between segments.
 *
 * @param {ReturnType<typeof tokens>} list
 * @param {number} from
 * @param {number} to exclusive
 * @return {string | undefined} decoded segments joined by {@link SEPARATOR}
 */
function layerNameKey(list, from, to) {
  let start = from;
  let end = to;
  while (start < end && list[start][0] === TokenType.Whitespace) {
    start += 1;
  }
  if (start === end) {
    return undefined;
  }
  // list[start] is not whitespace, so trimming from the end stops before it.
  while (list[end - 1][0] === TokenType.Whitespace) {
    end -= 1;
  }
  if ((end - start) % 2 === 0) {
    return undefined;
  }

  let key = '';
  for (let index = start; index < end; index += 1) {
    const token = list[index];
    if ((index - start) % 2) {
      if (token[0] !== TokenType.Delim || token[1] !== '.') {
        return undefined;
      }
    } else {
      if (token[0] !== TokenType.Ident) {
        return undefined;
      }
      const segment = decoded(token);
      if (cssWideKeywords.has(asciiLowerCase(segment))) {
        return undefined;
      }
      key += (key && SEPARATOR) + segment;
    }
  }
  return key;
}

/**
 * Parses `<layer-name>#` per CSS Cascade 5. Browsers ignore a statement
 * with any invalid name, so those return `undefined` and declare nothing,
 * as does an empty prelude, which names no layer.
 *
 * @param {string} params
 * @return {string[] | undefined}
 */
function parseLayerNames(params) {
  const list = tokens(params).filter((token) => token[0] !== TokenType.Comment);
  /** @type {string[]} */
  const names = [];
  let from = 0;
  for (let index = 0; index <= list.length; index += 1) {
    if (index === list.length || list[index][0] === TokenType.Comma) {
      const key = layerNameKey(list, from, index);
      if (key === undefined) {
        return undefined;
      }
      names.push(key);
      from = index + 1;
    }
  }
  return names;
}

/**
 * @param {string} parent key of the enclosing layer, '' outside layers
 * @param {string} name never empty: an `<ident>` has at least one code point
 * @return {string}
 */
function joinKey(parent, name) {
  return parent ? parent + SEPARATOR + name : name;
}

/**
 * @param {import('postcss').AnyNode} node
 * @param {import('postcss').Container['nodes']} sub
 * @param {boolean} isLayer
 * @param {boolean} isRedundantLayer
 * @return {boolean}
 */
function shouldDiscard(node, sub, isLayer, isRedundantLayer) {
  const { type } = node;

  return Boolean(
    (type === 'decl' && !node.value && !node.prop.startsWith('--')) ||
    (type === 'rule' && !node.selector) ||
    (sub && !sub.length && !isLayer) ||
    isRedundantLayer ||
    (type === 'atrule' &&
      ((!sub && !node.params) ||
        (!node.params &&
          !(/** @type {import('postcss').ChildNode[]} */ (sub).length))))
  );
}

/**
 * An empty `@layer x{}` is redundant only when an earlier block or statement
 * already fixed the order of `x`. Every ancestor other than `@layer` is
 * treated as a condition, so an earlier declaration counts only at top level
 * or under a condition that also encloses the later block.
 *
 * @param {import('postcss').Root} css
 * @param {import('postcss').Result} result
 * @return {void}
 */
function discardAndReport(css, result) {
  /** Layer keys declared in each open condition, outermost (top level) first.
   * Sets are created on first use; most conditions declare no layer.
   * @type {(Set<string> | undefined)[]} */
  const scopes = [undefined];
  let unnamedLayers = 0;

  /** @param {string} layerKey */
  const isDeclared = (layerKey) => scopes.some((scope) => scope?.has(layerKey));

  /**
   * Naming `a.b` also creates its parent `a` (CSS Cascade 5), so every
   * prefix of the path becomes declared.
   *
   * @param {string} parentKey
   * @param {string} name
   */
  const declare = (parentKey, name) => {
    let key = parentKey;
    for (const segment of name.split(SEPARATOR)) {
      key = joinKey(key, segment);
      (scopes[scopes.length - 1] ??= new Set()).add(key);
    }
  };

  /**
   * Layers are transparent to conditions; any other container opens one.
   *
   * @param {import('postcss').Container} container
   * @param {boolean} isLayer
   * @param {string} layerKey
   * @return {void}
   */
  function walkChildren(container, isLayer, layerKey) {
    if (!isLayer) {
      scopes.push(undefined);
    }
    container.each((child) => discardEmpty(child, layerKey));
    if (!isLayer) {
      scopes.pop();
    }
  }

  /**
   * @param {import('postcss').AnyNode} node
   * @param {string} parentKey key of the enclosing layer, '' outside layers
   * @return {void}
   */
  function discardEmpty(node, parentKey = '') {
    const { type } = node;
    /** @type {import('postcss').ChildNode[] | undefined} */
    const sub = /** @type {import('postcss').Container} */ (node).nodes;
    const isLayer = type === 'atrule' && asciiLowerCase(node.name) === 'layer';
    const names = isLayer ? parseLayerNames(node.params) : undefined;
    // A block takes one name; an unnamed or invalid block gets a segment
    // no other layer can share.
    const name = sub && names?.length === 1 ? names[0] : undefined;
    let layerKey = parentKey;

    if (isLayer && sub) {
      layerKey = joinKey(parentKey, name ?? `${SEPARATOR}${unnamedLayers++}`);
    } else if (names) {
      // `@layer a, b.c;` fixes the order of each listed layer.
      for (const listed of names) {
        declare(parentKey, listed);
      }
    }

    if (sub) {
      walkChildren(
        /** @type {import('postcss').Container} */ (node),
        isLayer,
        layerKey
      );
    }

    const isRedundantLayer =
      name !== undefined && sub?.length === 0 && isDeclared(layerKey);

    if (shouldDiscard(node, sub, isLayer, isRedundantLayer)) {
      node.remove();

      result.messages.push({
        type: 'removal',
        plugin,
        node,
      });
    } else if (name !== undefined) {
      declare(parentKey, name);
    }
  }

  css.each((node) => discardEmpty(node));
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: plugin,
    /**
     * @param {import('postcss').Root} css
     * @param {import('postcss').Helpers} helpers
     */
    OnceExit(css, { result }) {
      discardAndReport(css, result);
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
