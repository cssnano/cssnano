import postcss from 'postcss';
import cssnanoUtils from 'cssnano-utils';

const { TokenType, asciiLowerCase, decoded, tokens } = cssnanoUtils;

const VENDOR_PREFIX = /^-(?:webkit|moz|o)-/v;

// Argument positions that hold a <counter-style-name>, written from CSS Lists 3
// and CSS GCPM rather than read from the plugin's grammar so the oracle does
// not inherit a mistake there.
const COUNTER_STYLE_ARGUMENT_POSITIONS = new Map([
  ['counter', [1]],
  ['counters', [2]],
  ['target-counter', [2]],
  ['target-counters', [3]],
]);

/**
 * @param {string} family lowercase at-rule name
 * @return {'keyframes' | 'counter-style' | undefined}
 */
function namespaceOf(family) {
  if (family.endsWith('keyframes')) {
    return 'keyframes';
  }
  return family.endsWith('counter-style') ? 'counter-style' : undefined;
}

/**
 * @param {import('postcss').Declaration} decl
 * @return {'keyframes' | 'counter-style' | undefined}
 */
function namespaceReferencedBy(decl) {
  const prop = asciiLowerCase(decl.prop).replace(VENDOR_PREFIX, '');
  if (prop === 'animation' || prop === 'animation-name') {
    return 'keyframes';
  }
  return prop === 'list-style' || prop === 'list-style-type'
    ? 'counter-style'
    : undefined;
}

/**
 * Which definitions each name resolves to, per declaration and per name
 * token. A definition is its at-rule family, its condition container
 * (cascade layers looked through) and its body. Two stylesheets that resolve
 * every reference identically behave identically for those references,
 * whatever names the plugin picked.
 *
 * Only top-level `animation`, `animation-name`, `list-style` and
 * `list-style-type` references are covered; names inside functions such as
 * `counter()` are not.
 *
 * @param {string} css
 * @return {string[][] | undefined} one entry per reference token, in order
 */
export function resolveReferences(css) {
  let root;
  try {
    root = postcss.parse(css, { from: undefined });
  } catch {
    return undefined;
  }

  /** @type {Map<import('postcss').Node, number>} */
  const containerOrdinals = new Map();
  /** @type {Map<string, Set<string>>} */
  const definitions = new Map();
  root.walkAtRules((atRule) => {
    const family = asciiLowerCase(atRule.name);
    const namespace = namespaceOf(family);
    if (!namespace) {
      return;
    }
    let container = atRule.parent;
    while (
      container?.type === 'atrule' &&
      asciiLowerCase(
        /** @type {import('postcss').AtRule} */ (container).name
      ) === 'layer'
    ) {
      container = container.parent;
    }
    if (container && !containerOrdinals.has(container)) {
      containerOrdinals.set(container, containerOrdinals.size);
    }
    // The prelude is exactly one name; browsers drop the rule otherwise. A
    // string names a keyframes rule but is not a <counter-style-name>.
    const rawParams = atRule.raws?.between
      ? atRule.params + atRule.raws.between
      : atRule.params;
    const nameTokens = tokens(rawParams).filter(
      (token) =>
        token[0] !== TokenType.Whitespace && token[0] !== TokenType.Comment
    );
    const [token] = nameTokens;
    if (
      nameTokens.length !== 1 ||
      !(
        token[0] === TokenType.Ident ||
        (token[0] === TokenType.String && namespace === 'keyframes')
      )
    ) {
      return;
    }
    const name =
      token[0] === TokenType.String
        ? /** @type {{value: string}} */ (token[4]).value
        : decoded(token);
    const key = `${namespace}:${name}`;
    const body = atRule.nodes ? atRule.nodes.toString() : '';
    const definition = `${family}@${container ? containerOrdinals.get(container) : -1}|${body}`;
    const known = definitions.get(key);
    if (known) {
      known.add(definition);
    } else {
      definitions.set(key, new Set([definition]));
    }
  });

  /** @type {string[][]} */
  const references = [];
  root.walkDecls((decl) => {
    const namespace = namespaceReferencedBy(decl);
    if (!namespace) {
      return;
    }
    for (const token of tokens(decl.value)) {
      if (token[0] !== TokenType.Ident && token[0] !== TokenType.String) {
        continue;
      }
      const name =
        token[0] === TokenType.String
          ? /** @type {{value: string}} */ (token[4]).value
          : decoded(token);
      references.push(
        [...(definitions.get(`${namespace}:${name}`) ?? [])].toSorted()
      );
    }
  });
  return references;
}

/**
 * @param {import('@csstools/css-tokenizer').CSSToken} token
 * @return {string | undefined}
 */
function spelledName(token) {
  if (token[0] === TokenType.String) {
    return /** @type {{value: string}} */ (token[4]).value;
  }
  return token[0] === TokenType.Ident ? decoded(token) : undefined;
}

/**
 * @param {import('postcss').Node} node
 * @return {boolean}
 */
function isInsideFunction(node) {
  let curr = node.parent;
  while (curr && curr.type !== 'root') {
    if (
      curr.type === 'atrule' &&
      asciiLowerCase(/** @type {import('postcss').AtRule} */ (curr).name) ===
        'function'
    ) {
      return true;
    }
    curr = curr.parent;
  }
  return false;
}

/**
 * @param {string} value
 * @param {Set<string>} names
 * @param {boolean} wholeValue
 * @return {void}
 */
function collectSubstitutedNames(value, names, wholeValue) {
  /** @type {Array<{ expectedArgs?: number[], argIndex: number, close: import('@csstools/css-tokenizer').TokenType }>} */
  const stack = [];
  for (const token of tokens(value)) {
    const type = token[0];
    const frame = stack.at(-1);
    if (type === TokenType.Function) {
      const funcName = asciiLowerCase(decoded(token));
      stack.push({
        expectedArgs: COUNTER_STYLE_ARGUMENT_POSITIONS.get(funcName),
        argIndex: 0,
        close: TokenType.CloseParen,
      });
    } else if (type === TokenType.OpenParen) {
      stack.push({ argIndex: 0, close: TokenType.CloseParen });
    } else if (type === TokenType.OpenSquare) {
      stack.push({ argIndex: 0, close: TokenType.CloseSquare });
    } else if (type === TokenType.OpenCurly) {
      stack.push({ argIndex: 0, close: TokenType.CloseCurly });
    } else if (type === frame?.close) {
      stack.pop();
    } else if (type === TokenType.Comma && frame) {
      frame.argIndex++;
    } else if (
      wholeValue ||
      (stack.length > 0 && !frame?.expectedArgs?.includes(frame.argIndex))
    ) {
      const name = spelledName(token);
      if (name !== undefined) {
        names.add(name);
      }
    }
  }
}

/**
 * Names that substituted text spells: custom property values, `var()`
 * fallbacks, `@function` definitions, and references inside functions other
 * than known counter-function argument slots.
 *
 * @param {import('postcss').Root} root
 * @return {Set<string>}
 */
function substitutedNames(root) {
  /** @type {Set<string>} */
  const names = new Set();
  root.walkDecls((decl) => {
    const prop = asciiLowerCase(decl.prop);
    const wholeValue =
      prop.startsWith('--') ||
      (prop === 'initial-value' &&
        decl.parent?.type === 'atrule' &&
        asciiLowerCase(
          /** @type {import('postcss').AtRule} */ (decl.parent).name
        ) === 'property') ||
      isInsideFunction(decl);
    collectSubstitutedNames(decl.value, names, wholeValue);
  });
  return names;
}

/**
 * Definitions, as `namespace:name`, of names that substituted text spells.
 * Such a name may be referenced once `var()` resolves, which no reference
 * walk sees, so its definition must survive any merge.
 *
 * @param {string} css
 * @return {string[] | undefined}
 */
export function collectProtectedNameDefinitions(css) {
  let root;
  try {
    root = postcss.parse(css, { from: undefined });
  } catch {
    return undefined;
  }
  const spelled = substitutedNames(root);
  /** @type {Set<string>} */
  const defined = new Set();
  root.walkAtRules((atRule) => {
    const namespace = namespaceOf(asciiLowerCase(atRule.name));
    const rawParams = atRule.raws?.between
      ? atRule.params + atRule.raws.between
      : atRule.params;
    const nameTokens = tokens(rawParams).filter(
      (token) =>
        token[0] !== TokenType.Whitespace && token[0] !== TokenType.Comment
    );
    const name =
      nameTokens.length === 1 ? spelledName(nameTokens[0]) : undefined;
    if (namespace && name !== undefined && spelled.has(name)) {
      defined.add(`${namespace}:${name}`);
    }
  });
  return [...defined].toSorted();
}
