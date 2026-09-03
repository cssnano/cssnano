import cssnanoUtils from 'cssnano-utils';
import cssesc from 'cssesc';

const { TokenType } = cssnanoUtils;
/** @type {typeof cssnanoUtils.balancedTokens} */
const balancedTokens = cssnanoUtils.balancedTokens;

/** @typedef {ReturnType<typeof balancedTokens> extends infer Structure ? Structure extends {tokens: readonly (infer Token)[]} ? Token : never : never} CSSToken */
/** @typedef {NonNullable<ReturnType<typeof balancedTokens>>} BalancedTokenStructure */

const selectorFunctions = new Set([
  'is',
  'matches',
  'not',
  'where',
  'has',
  'host',
  'host-context',
  'slotted',
  'deep',
  'global',
]);
const pseudoElements = new Set([
  'before',
  'after',
  'first-letter',
  'first-line',
]);
const operators = new Set(['=', '~=', '|=', '^=', '$=', '*=']);

/** @param {string} value */
function unquote(value) {
  const raw = value.slice(1, -1);
  if (!raw || raw === '-' || /[\s"'()[\]{}=~|^$*]/u.test(raw)) return value;
  const unescaped = raw.replace(/\\([\\"'])/gu, '$1');
  return cssesc(unescaped, { isIdentifier: true }) === unescaped
    ? unescaped
    : value;
}
/** @param {string} value */
function normalizeFormula(value) {
  return value
    .replace(/\s*([+])\s*/gu, '$1')
    .replace(/\b[Ee][Vv][Ee][Nn]\b/gu, 'even')
    .replace(/\b[Oo][Dd][Dd]\b/gu, 'odd');
}

/** @param {string} source @param {readonly CSSToken[]} tokens @param {BalancedTokenStructure} structure @param {number} start @param {number} finish @return {string} */
function normalizeRange(source, tokens, structure, start, finish) {
  /** @type {string[]} */ const output = [];
  /** @type {string[]} */ const strings = [];
  /** @type {{operator: boolean, value: boolean}[]} */
  const attributes = [];
  for (let index = start; index < finish; index++) {
    const token = tokens[index];
    const type = token[0];
    const next = tokens[index + 1];
    const previous = tokens[index - 1];
    if (type === TokenType.Comment) {
      addComment(output, token[1]);
      continue;
    }
    if (type === TokenType.OpenSquare) {
      attributes.push({ operator: false, value: false });
      output.push(token[1]);
      continue;
    }
    if (type === TokenType.CloseSquare) {
      attributes.pop();
      output.push(token[1]);
      continue;
    }
    if (type === TokenType.Whitespace) {
      const attribute = attributes.at(-1);
      if (keepWhitespace(attribute, previous, next)) output.push(' ');
      continue;
    }
    const attribute = attributes.at(-1);
    updateAttribute(attribute, token);
    if (type === TokenType.Function) {
      const end = structure.endForOpening(index);
      if (end === undefined || end > finish)
        return source.slice(token[2] - 1, source.length);
      const normalized = normalizeFunction(
        source,
        tokens,
        structure,
        index,
        end
      );
      if (normalized.startsWith(':') && output.at(-1) === ':') output.pop();
      output.push(normalized);
      index = end;
      continue;
    }
    if (type === TokenType.String) {
      strings.push(attributeString(token[1], attributes.length > 0));
      output.push(`\uE000${strings.length - 1}\uE001`);
      continue;
    }
    if (legacyPseudo(token, next, tokens[index + 2])) {
      output.push(':');
      index++;
      continue;
    }
    if (
      type === TokenType.Delim &&
      token[1] === '*' &&
      !attributes.length &&
      skipUniversal(next, output.at(-1)?.at(-1))
    )
      continue;
    output.push(token[1]);
  }
  const serialized = output
    .join('')
    .trim()
    .replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/gu, (value) => {
      strings.push(value);
      return `\uE000${strings.length - 1}\uE001`;
    });
  return serialized
    .replace(/\s*([>+~])\s*/gu, '$1')
    .replace(/\s*\/deep\/\s*/giu, '/deep/')
    .replace(/\uE000(\d+)\uE001/gu, (_, index) => strings[Number(index)]);
}

/** @param {{operator: boolean, value: boolean} | undefined} attribute @param {CSSToken} token */
function updateAttribute(attribute, token) {
  if (!attribute) return;
  if (typeIsOperator(token)) attribute.operator = true;
  if (
    attribute.operator &&
    (token[0] === TokenType.Ident || token[0] === TokenType.String)
  )
    attribute.value = true;
}
/** @param {CSSToken} token @return {boolean} */
function typeIsOperator(token) {
  return token[0] === TokenType.Delim && operators.has(token[1]);
}
/** @param {string} value @param {boolean} inAttribute @return {string} */
function attributeString(value, inAttribute) {
  return inAttribute ? unquote(value).replace(/\\\n/gu, '') : value;
}

/** @param {string[]} output @param {string} value */
function addComment(output, value) {
  // Ordinary comments are whitespace in CSS. Preserve a token boundary when
  // removing one; otherwise `h1/**/p` would become the different selector
  // `h1p`.
  output.push(value.startsWith('/*!') ? value : ' ');
}
/** @param {CSSToken} token @param {CSSToken | undefined} next @param {CSSToken | undefined} name */
function legacyPseudo(token, next, name) {
  return (
    token[0] === TokenType.Colon &&
    next?.[0] === TokenType.Colon &&
    pseudoElements.has(name?.[1]?.toLowerCase() ?? '')
  );
}
/** @param {CSSToken | undefined} next @param {string | undefined} before */
function skipUniversal(next, before) {
  return Boolean(
    next &&
    next[0] !== TokenType.Whitespace &&
    next[0] !== TokenType.Comma &&
    next[0] !== TokenType.CloseParen &&
    !['>', '+', '~'].includes(next[1] ?? '') &&
    before !== '|' &&
    !['>', '+', '~'].includes(before ?? '')
  );
}

/** @param {string} name @param {string} value */
/** @param {{operator: boolean, value: boolean} | undefined} attribute @param {CSSToken | undefined} previous @param {CSSToken | undefined} next @return {boolean} */
function keepWhitespace(attribute, previous, next) {
  if (attribute) return next?.[0] === TokenType.Ident && attribute.value;
  return (
    previous?.[0] !== TokenType.Comma &&
    next?.[0] !== TokenType.Comma &&
    next?.[0] !== TokenType.CloseParen &&
    next?.[0] !== TokenType.CloseSquare
  );
}

/** @param {string} source @param {readonly CSSToken[]} tokens @param {BalancedTokenStructure} structure @param {number} index @param {number} end @return {string} */
function normalizeFunction(source, tokens, structure, index, end) {
  const name = tokens[index][1].slice(0, -1);
  const lower = name.toLowerCase();
  let inner = selectorFunctions.has(lower)
    ? normalizeListFromTokens(
        source,
        tokens,
        structure,
        index + 1,
        end,
        false
      ).join(',')
    : normalizeRange(source, tokens, structure, index + 1, end);
  if (lower.startsWith('nth-')) inner = normalizeNth(lower, inner);
  if (lower.startsWith('nth-') && inner.startsWith(':')) return inner;
  return `${lower.startsWith('nth-') ? lower : name}(${inner})`;
}

/** @param {string} name @param {string} value @return {string} */
function normalizeNth(name, value) {
  const kind = name.slice(4);
  const formula = normalizeFormula(value).trim();
  if (formula === '1') {
    if (!['child', 'of-type', 'last-child', 'last-of-type'].includes(kind))
      return `${name}(${formula})`;
    if (kind === 'child') return ':first-child';
    if (kind === 'of-type') return ':first-of-type';
    return `:${kind}`;
  }
  if (formula.toLowerCase() === 'even') return '2n';
  if (/^2n\+1$/iu.test(formula)) return 'odd';
  return formula;
}

/** @param {string} source @param {readonly CSSToken[]} tokens @param {BalancedTokenStructure} structure @param {number} start @param {number} finish @param {boolean} sort @return {string[]} */
function normalizeListFromTokens(
  source,
  tokens,
  structure,
  start,
  finish,
  sort
) {
  /** @type {string[]} */ const entries = [];
  const seen = new Set();
  let part = start;
  for (let index = start; index < finish; index++) {
    const type = tokens[index][0];
    const frameEnd = structure.endForOpening(index);
    if (frameEnd !== undefined) {
      index = frameEnd;
      continue;
    }
    if (type === TokenType.Comma) {
      let value = normalizeRange(source, tokens, structure, part, index);
      if (value.toLowerCase() === 'from') value = '0%';
      if (value === '100%') value = 'to';
      // Keep duplicate vendor pseudo-element selectors until
      // postcss-unique-selectors runs. Removing them here changes whether
      // postcss-merge-rules can distinguish vendor-specific rule boundaries.
      const preserveDuplicate = /::-[\w-]+/u.test(value);
      if (value && (preserveDuplicate || !seen.has(value))) {
        seen.add(value);
        entries.push(value);
      }
      part = index + 1;
    }
  }
  let value = normalizeRange(source, tokens, structure, part, finish);
  if (value.toLowerCase() === 'from') value = '0%';
  if (value === '100%') value = 'to';
  const preserveDuplicate = /::-[\w-]+/u.test(value);
  if (value && (preserveDuplicate || !seen.has(value))) entries.push(value);
  if (sort) entries.sort();
  return entries;
}

/** @param {string} selector @return {string[]} */
function compoundEdges(selector) {
  /** @type {string[]} */ const result = [];
  if (!/[\s>+~]/u.test(selector)) return [selector];
  const structure = balancedTokens(selector);
  if (!structure) return [selector];
  const { tokens } = structure;
  let start = 0;
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const frameEnd = structure.endForOpening(index);
    if (frameEnd !== undefined) {
      index = frameEnd;
      continue;
    }
    if (
      token[0] === TokenType.Whitespace ||
      (token[0] === TokenType.Delim && /[>+~]/u.test(token[1]))
    ) {
      const from = start < tokens.length ? tokens[start][2] : 0;
      if (token[2] > from) result.push(selector.slice(from, token[2]));
      result.push(token[1].trim() || ' ');
      start = index + 1;
    }
  }
  if (start < tokens.length) result.push(selector.slice(tokens[start][2]));
  return result.filter(Boolean);
}

/** @param {string[]} selectors @return {string[]} */
function fold(selectors) {
  if (selectors.length < 2) return selectors;
  const cells = selectors.map(compoundEdges);
  let prefix = 0;
  while (
    prefix < Math.min(...cells.map((x) => x.length)) &&
    cells.every((x) => x[prefix] === cells[0][prefix])
  )
    prefix++;
  let suffix = 0;
  while (
    suffix < Math.min(...cells.map((x) => x.length)) - prefix &&
    cells.every((x) => x.at(-1 - suffix) === cells[0][x.length - 1 - suffix])
  )
    suffix++;
  const middles = cells.map((x) => x.slice(prefix, x.length - suffix));
  if (
    (!prefix && !suffix) ||
    middles.some(
      (x) => x.length !== 1 || /[>+~ ]/u.test(x[0]) || unsafeMiddle(x[0])
    )
  )
    return selectors;
  const specificity = specificityOf;
  if (new Set(middles.map((x) => specificity(x[0]))).size > 1) return selectors;
  const unique = [...new Set(middles.map((x) => x[0]))];
  const folded = `${cells[0].slice(0, prefix).join('')}:is(${unique.join(',')})${cells[0].slice(cells[0].length - suffix).join('')}`;
  return folded.length < selectors.join(',').length ? [folded] : selectors;
}

/** @param {string} value @return {string} */
function specificityOf(value) {
  const structure = balancedTokens(value);
  if (!structure) return 'invalid';
  let id = 0;
  let cls = 0;
  let type = 0;
  let inAttribute = false;
  let afterClass = false;
  let afterId = false;
  let afterPseudo = false;
  for (const token of structure.tokens) {
    const kind = token[0];
    if (kind === TokenType.OpenSquare) {
      cls++;
      inAttribute = true;
    } else if (kind === TokenType.CloseSquare) {
      inAttribute = false;
    } else if (!inAttribute && kind === TokenType.Hash) {
      id++;
      afterId = true;
      afterPseudo = false;
    } else if (!inAttribute && kind === TokenType.Delim && token[1] === '.') {
      cls++;
      afterClass = true;
      afterPseudo = false;
    } else if (!inAttribute && kind === TokenType.Colon) {
      cls++;
      afterClass = false;
      afterId = false;
      afterPseudo = true;
    } else if (!inAttribute && kind === TokenType.Ident) {
      if (afterClass || afterId || afterPseudo) {
        afterClass = false;
        afterId = false;
        afterPseudo = false;
      } else {
        type++;
      }
    }
  }
  return `${id},${cls},${type}`;
}

/** @param {string} value @return {boolean} */
function unsafeMiddle(value) {
  const structure = balancedTokens(value);
  if (!structure) return true;
  if (/\|(?!=)/u.test(value) || /\s+[is]\s*\]/iu.test(value)) return true;
  const { tokens } = structure;
  let inAttribute = false;
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    const next = tokens[index + 1];
    if (token[0] === TokenType.OpenSquare) {
      inAttribute = true;
      continue;
    }
    if (token[0] === TokenType.CloseSquare) {
      inAttribute = false;
      continue;
    }
    if (token[0] === TokenType.Function) return true;
    if (token[0] === TokenType.Delim && (token[1] === '&' || token[1] === '|'))
      return true;
    if (!inAttribute && token[0] === TokenType.Colon && unsafePseudo(next))
      return true;
  }
  return false;
}

/** @param {CSSToken | undefined} token @return {boolean} */
function unsafePseudo(token) {
  if (token?.[0] === TokenType.Colon) return true;
  const name = token?.[1]?.toLowerCase();
  if (name && ['before', 'after', 'first-letter', 'first-line'].includes(name))
    return true;
  return !['hover', 'focus', 'active', 'visited', 'link'].includes(name ?? '');
}

/** @param {string} source @param {boolean} [sort] @param {boolean} [convertToIs] @return {string} */
function normalizeList(source, sort = true, convertToIs = true) {
  const structure = balancedTokens(source);
  if (!structure) return source;
  const entries = normalizeListFromTokens(
    source,
    structure.tokens,
    structure,
    0,
    structure.tokens.length,
    sort
  );
  return (convertToIs ? fold(entries) : entries).join(',');
}

/** @param {string} source @return {string[]} */
function splitList(source) {
  const structure = balancedTokens(source);
  if (!structure) return [source];
  return structure.topLevelSegments().map(({ startIndex, endIndex }) => {
    const start = structure.tokens[startIndex]?.[2] ?? source.length;
    const end =
      endIndex > startIndex ? structure.tokens[endIndex - 1][3] + 1 : start;
    return source.slice(start, end);
  });
}

export { normalizeList, splitList };
