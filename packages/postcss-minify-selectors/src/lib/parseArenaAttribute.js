import cssnanoUtils from 'cssnano-utils';
import { isTrivia, mergeStatus } from './parseArenaStructure.js';
import { decodedIdent } from './tokenUtils.js';

const { TokenType } = cssnanoUtils;
/** @typedef {import('./arena.js').ParseStatus} ParseStatus */
/** @typedef {import('./arena.js').QualifiedNamePayload} QualifiedNamePayload */
/** @typedef {NonNullable<ReturnType<typeof cssnanoUtils.balancedTokens>>} Structure */
/** @typedef {Parameters<Parameters<typeof import('./arena.js').buildSelectorArena>[2]>[0]} Builder */

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} index @param {number} end */
export function qualifiedNameAt(input, index, end) {
  const first = input[index];
  const isName = isQualifiedNameToken(first);
  const empty =
    first?.[0] === TokenType.Delim &&
    first[1] === '|' &&
    input[index + 1]?.[1] !== '|';
  if (!isName && !empty) return;
  let subjectIndex = index;
  let namespace =
    /** @type {{kind:'absent'}|{kind:'empty'}|{kind:'wildcard'}|{kind:'named',token:number}} */ ({
      kind: 'absent',
    });
  if (empty) {
    namespace = { kind: 'empty' };
    subjectIndex = index + 1;
  } else if (input[index + 1]?.[1] === '|' && input[index + 2]?.[1] !== '|') {
    namespace =
      first[1] === '*' ? { kind: 'wildcard' } : { kind: 'named', token: index };
    subjectIndex = index + 2;
  }
  const subject = input[subjectIndex];
  if (subjectIndex >= end || !isQualifiedNameToken(subject))
    return { invalidEnd: Math.min(subjectIndex + 1, end) };
  return {
    end: subjectIndex + 1,
    payload: {
      namespace,
      subject:
        subject[1] === '*'
          ? { kind: /** @type {const} */ ('universal'), token: subjectIndex }
          : { kind: /** @type {const} */ ('type'), token: subjectIndex },
    },
  };
}

/** @param {import('./tokenUtils.js').CSSToken | undefined} token */
function isQualifiedNameToken(token) {
  return (
    token?.[0] === TokenType.Ident ||
    (token?.[0] === TokenType.Delim && token[1] === '*')
  );
}

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} index @param {number} end */
function skipTrivia(input, index, end) {
  let cursor = index;
  while (cursor < end && isTrivia(input[cursor])) cursor++;
  return cursor;
}

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} index */
function attributeMatcher(input, index) {
  if (input[index]?.[1] === '=') return { matcher: '=', end: index + 1 };
  const prefix = input[index]?.[1];
  if (
    (prefix === '~' ||
      prefix === '|' ||
      prefix === '^' ||
      prefix === '$' ||
      prefix === '*') &&
    input[index + 1]?.[1] === '='
  )
    return { matcher: `${prefix}=`, end: index + 2 };
  return { matcher: undefined, end: index };
}

/** @param {readonly import('./tokenUtils.js').CSSToken[]} input @param {number} index @param {number} end */
function attributeValue(input, index, end) {
  let cursor = skipTrivia(input, index, end);
  if (
    input[cursor]?.[0] !== TokenType.Ident &&
    input[cursor]?.[0] !== TokenType.String
  )
    return { status: /** @type {ParseStatus} */ ('invalid'), cursor };
  const valueToken = cursor++;
  const beforeTrivia = cursor;
  cursor = skipTrivia(input, cursor, end);
  let modifierToken;
  let caseBehavior =
    /** @type {'default'|'ascii-insensitive'|'case-sensitive'} */ ('default');
  if (input[cursor]?.[0] === TokenType.Ident) {
    const lower = decodedIdent(input[cursor]);
    if (
      (input[valueToken]?.[0] === TokenType.Ident && cursor === beforeTrivia) ||
      (lower !== 'i' && lower !== 's')
    )
      return { status: /** @type {ParseStatus} */ ('invalid'), cursor };
    modifierToken = cursor++;
    caseBehavior = lower === 'i' ? 'ascii-insensitive' : 'case-sensitive';
  }
  return {
    status: /** @type {ParseStatus} */ ('valid'),
    cursor,
    valueToken,
    modifierToken,
    caseBehavior,
  };
}

/**
 * Parse the optional namespace prefix and attribute name of `[ns|name...]`.
 *
 * @param {Structure['tokens']} input @param {number} start @param {number} close
 */
function attributeName(input, start, close) {
  const name =
    input[start]?.[0] === TokenType.Ident &&
    input[start + 1]?.[1] === '|' &&
    input[start + 2]?.[1] === '='
      ? {
          end: start + 1,
          payload: {
            namespace: { kind: /** @type {const} */ ('absent') },
            subject: {
              kind: /** @type {const} */ ('type'),
              token: start,
            },
          },
        }
      : qualifiedNameAt(input, start, close);
  if (!name?.end) {
    return {
      status: /** @type {ParseStatus} */ ('invalid'),
      namespace: { kind: /** @type {const} */ ('absent') },
      nameToken: start,
      cursor: close,
    };
  }
  const payload = /** @type {QualifiedNamePayload} */ (name.payload);
  return {
    status: /** @type {ParseStatus} */ (
      payload.subject.kind === 'type' ? 'valid' : 'invalid'
    ),
    namespace: payload.namespace,
    nameToken: payload.subject.token,
    cursor: skipTrivia(input, name.end, close),
  };
}

/** @param {Builder} builder @param {Structure} structure @param {number} index */
export function addAttribute(builder, structure, index) {
  const input = structure.tokens;
  const close = structure.endForOpening(index);
  if (close === undefined) return index + 1;
  const parsedName = attributeName(
    input,
    skipTrivia(input, index + 1, close),
    close
  );
  let status = parsedName.status;
  const { namespace, nameToken } = parsedName;
  let cursor = parsedName.cursor;
  const parsedMatcher = attributeMatcher(input, cursor);
  const matcher = parsedMatcher.matcher;
  cursor = parsedMatcher.end;
  let valueToken;
  let modifierToken;
  let caseBehavior =
    /** @type {'default'|'ascii-insensitive'|'case-sensitive'} */ ('default');
  if (matcher) {
    const value = attributeValue(input, cursor, close);
    status = mergeStatus(status, value.status);
    cursor = value.cursor;
    valueToken = value.valueToken;
    modifierToken = value.modifierToken;
    caseBehavior = value.caseBehavior ?? caseBehavior;
  }
  cursor = skipTrivia(input, cursor, close);
  if (cursor !== close) status = 'invalid';
  builder.leaf('attribute', index, close + 1, {
    status,
    payload: builder.payload('attributes', {
      namespace,
      nameToken,
      matcher,
      valueToken,
      modifierToken,
      caseBehavior,
    }),
  });
  return close + 1;
}
