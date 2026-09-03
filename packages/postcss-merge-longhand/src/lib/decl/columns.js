import cssnanoUtils from 'cssnano-utils';
import stylehacks from 'stylehacks';
import canMerge from '../canMerge.js';
import getDecls from '../getDecls.js';
import cleanupDeclarations from '../cleanupDeclarations.js';
import getValue from '../getValue.js';
import mergeRules from '../mergeRules.js';
import insertCloned from '../insertCloned.js';
import { isFallback } from '../isFallback.js';
import canExplode from '../canExplode.js';
import { shorthand, initialValues } from '../spec.js';

const { TokenType, tokenEnd, tokenStart, tokens } = cssnanoUtils;

const columns = 'columns';
/* The properties the shorthand sets */
const columnProperties = ['column-width', 'column-count'];
const columnPropertiesSet = new Set(columnProperties);
/* Column properties the shorthand does not set */
const otherColumnProperties = new Set(
  shorthand(columns).longhands.filter(
    (property) => !columnPropertiesSet.has(property)
  )
);
const auto = /** @type {string} */ (initialValues.get(columnProperties[0]));
const inherit = 'inherit';
/* A unit is a bare identifier, so `30em/10em` is not a length. */
const lengthUnitRegex = /^[a-z]+$/i;
const openingTokens = new Set([
  TokenType.Function,
  TokenType.OpenParen,
  TokenType.OpenSquare,
  TokenType.OpenCurly,
]);
const closingTokens = new Set([
  TokenType.CloseParen,
  TokenType.CloseSquare,
  TokenType.CloseCurly,
]);

/**
 * @param {string} value
 * @return {{ value: string, hasTopLevelSlash: boolean, terms: { start: number, end: number, tokenCount: number, type: import('@csstools/css-tokenizer').TokenType, decoded: unknown, rawUnit: string }[] }}
 */
function tokenizeColumns(value) {
  /** @type {{ start: number, end: number, tokenCount: number, type: import('@csstools/css-tokenizer').TokenType, decoded: unknown, rawUnit: string }[]} */
  const terms = [];
  let start = -1;
  let end = -1;
  let tokenCount = 0;
  let type = TokenType.EOF;
  /** @type {unknown} */
  let decoded;
  let rawUnit = '';
  let depth = 0;
  let hasTopLevelSlash = false;

  const push = () => {
    if (!tokenCount) return;
    terms.push({ start, end, tokenCount, type, decoded, rawUnit });
    start = -1;
    end = -1;
    tokenCount = 0;
    type = TokenType.EOF;
    decoded = undefined;
    rawUnit = '';
  };

  for (const token of tokens(value)) {
    const tokenType = token[0];
    if (tokenType === TokenType.EOF) continue;

    if (depth === 0 && tokenType === TokenType.Whitespace) {
      push();
      continue;
    }

    if (tokenCount === 0) {
      start = tokenStart(token);
      type = /** @type {import('@csstools/css-tokenizer').TokenType} */ (
        tokenType
      );
      decoded = token[4];
      if (tokenType === TokenType.Dimension) {
        rawUnit = token[1].replace(
          /^[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/,
          ''
        );
      }
    }
    if (depth === 0 && tokenType === TokenType.Delim && token[1] === '/')
      hasTopLevelSlash = true;
    tokenCount++;
    end = tokenEnd(token);
    if (openingTokens.has(token[0])) depth++;
    if (closingTokens.has(token[0]) && depth) depth--;
  }
  push();

  return { value, hasTopLevelSlash, terms };
}

/** @type {WeakMap<import('postcss').Declaration, { value: string, parsed: ReturnType<typeof tokenizeColumns> }>} */
const parsedDeclarations = new WeakMap();

/** @param {import('postcss').Declaration} declaration @return {ReturnType<typeof tokenizeColumns>} */
function parsedValue(declaration) {
  const cached = parsedDeclarations.get(declaration);
  if (!cached || cached.value !== declaration.value) {
    const parsed = tokenizeColumns(declaration.value);
    parsedDeclarations.set(declaration, { value: declaration.value, parsed });
    return parsed;
  }
  return cached.parsed;
}

/**
 * @param {ReturnType<typeof tokenizeColumns>} parsed
 * @param {ReturnType<typeof tokenizeColumns>['terms'][number]} term
 * @return {string}
 */
function rawValue(parsed, term) {
  return parsed.value.slice(term.start, term.end);
}

/**
 * Normalize a columns shorthand definition. Both of the longhand
 * properties' initial values are 'auto', and as per the spec,
 * omitted values are set to their initial values. Thus, we can
 * remove any 'auto' definition when there are two values.
 *
 * Specification link: https://www.w3.org/TR/css3-multicol/
 *
 * @param {[string, string]} values
 * @return {string}
 */
function normalize(values) {
  if (values[0].toLowerCase() === auto) {
    return values[1];
  }

  if (values[1].toLowerCase() === auto) {
    return values[0];
  }

  if (
    values[0].toLowerCase() === inherit &&
    values[1].toLowerCase() === inherit
  ) {
    return inherit;
  }

  return values.join(' ');
}
/**
 * The component a value can only have come from: `column-width` takes a
 * length, `column-count` an integer, and `auto` fits either.
 *
 * @param {ReturnType<typeof tokenizeColumns>['terms'][number]} term
 * @return {'width' | 'count' | 'initial' | undefined} undefined for anything
 * else, since a value this cannot classify, `calc()` among them, could be
 * either.
 */
function componentRole(term) {
  const decoded =
    /** @type {{ value?: string } | undefined} */ (term.decoded)?.value;

  if (
    term.tokenCount === 1 &&
    term.type === TokenType.Ident &&
    decoded?.toLowerCase() === auto
  ) {
    return 'initial';
  }

  if (term.tokenCount === 1 && term.type === TokenType.Number) {
    return /** @type {{ type?: string }} */ (term.decoded).type === 'integer' &&
      /** @type {{ signCharacter?: string }} */ (term.decoded).signCharacter ===
        undefined
      ? 'count'
      : undefined;
  }

  if (term.tokenCount === 1 && term.type === TokenType.Dimension) {
    return lengthUnitRegex.test(term.rawUnit) ? 'width' : undefined;
  }

  return undefined;
}

/**
 * Takes the shorthand apart into the values it gives `column-width` and
 * `column-count`, filling in the initial value for a component it leaves out.
 * The two are combined with `||`, so they may appear in either order.
 *
 * https://drafts.csswg.org/css-multicol-2/#columns
 *
 * @param {ReturnType<typeof tokenizeColumns>} parsed
 * @return {[string, string] | undefined} undefined when the value is not a form
 * that can be taken apart without guessing which component a value belongs to.
 */
function parseColumns(parsed) {
  const values = parsed.terms;

  if (values.length > columnProperties.length) {
    return undefined;
  }

  /** @type {(string | undefined)[]} */
  const result = [undefined, undefined];
  /** @type {string[]} */
  const ambiguous = [];

  for (const component of values) {
    const role = componentRole(component);

    if (role === undefined) {
      return undefined;
    }

    if (role === 'initial') {
      ambiguous.push(rawValue(parsed, component));
      continue;
    }

    const index = role === 'width' ? 0 : 1;

    if (result[index] !== undefined) {
      return undefined;
    }

    result[index] = rawValue(parsed, component);
  }

  /* `auto` names whichever component the rest of the value does not. */
  for (const component of ambiguous) {
    const free = result.indexOf(undefined);

    if (free === -1) {
      return undefined;
    }

    result[free] = component;
  }

  return /** @type {[string, string]} */ (
    result.map((component) => component ?? auto)
  );
}

/**
 * Check if a declaration sets column properties beyond `column-width` and
 * `column-count`. The `columns: <width> / <height>` form sets others (like
 * `column-height`), so we detect the slash. Only top-level slashes separate
 * components; ones in functions like `calc(100%/3)` do not.
 *
 * @param {import('postcss').Declaration} declaration
 * @return {boolean}
 */
function setsOtherColumnProperty(declaration) {
  const prop = declaration.prop.toLowerCase();

  if (otherColumnProperties.has(prop)) {
    return true;
  }

  return prop === columns && parsedValue(declaration).hasTopLevelSlash;
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
function explode(rule) {
  rule.walkDecls((decl) => {
    if (decl.prop.toLowerCase() !== columns) {
      return;
    }

    if (!canExplode(decl)) {
      return;
    }

    if (stylehacks.detect(decl)) {
      return;
    }

    const values = parseColumns(parsedValue(decl));

    if (!values) {
      return;
    }

    for (const [i, value] of values.entries()) {
      insertCloned(/** @type {import('postcss').Rule} */ (decl.parent), decl, {
        prop: columnProperties[i],
        value,
      });
    }

    decl.remove();
  });
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
function cleanup(rule) {
  const decls = getDecls(rule, new Set([columns].concat(columnProperties)));
  cleanupDeclarations(
    decls,
    (node, lastNode) =>
      lastNode.prop === columns &&
      node.prop !== lastNode.prop &&
      !isFallback(node, lastNode)
  );
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
function merge(rule) {
  mergeRules(rule, columnProperties, (rules, lastNode) => {
    if (canMerge(rules) && !rules.some(stylehacks.detect)) {
      insertCloned(
        /** @type {import('postcss').Rule} */ (lastNode.parent),
        lastNode,
        {
          prop: columns,
          value: normalize(/** @type [string, string] */ (rules.map(getValue))),
        }
      );

      for (const node of rules) {
        node.remove();
      }

      return true;
    }
    return false;
  });

  cleanup(rule);
}

export default {
  explode,
  merge,
  setsOtherColumnProperty,
};
