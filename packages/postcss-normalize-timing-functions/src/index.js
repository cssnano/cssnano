import cssnanoUtils from 'cssnano-utils';

const { TokenType, decoded } = cssnanoUtils;
/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @type {(source: string) => {tokens: readonly CSSToken[], endForOpening(index: number): number | undefined, topLevelSegments(start: number, end: number): {startIndex: number, endIndex: number}[]} | undefined} */
const getBalancedTokens = cssnanoUtils.balancedTokens;
const animationTransitionRegex =
  /^(?:-\w+-)?(?:animation|transition)(?:-timing-function)?$/i;

/* Works because toString() normalizes the formatting,
   so comparing the string forms behaves the same as number equality*/
const conversions = new Map([
  [[0.25, 0.1, 0.25, 1].toString(), 'ease'],
  [[0, 0, 1, 1].toString(), 'linear'],
  [[0.42, 0, 1, 1].toString(), 'ease-in'],
  [[0, 0, 0.58, 1].toString(), 'ease-out'],
  [[0.42, 0, 0.58, 1].toString(), 'ease-in-out'],
]);
/** @param {string} value @return {string} */
const asciiLowerCase = (value) =>
  value.replace(/[A-Z]/g, (char) => char.toLowerCase());

/** @param {readonly CSSToken[]} input @param {{startIndex: number, endIndex: number}} segment @return {CSSToken | undefined} */
function singleToken(input, segment) {
  /** @type {CSSToken | undefined} */
  let result;
  for (let index = segment.startIndex; index < segment.endIndex; index++) {
    const token = input[index];
    if (token[0] === TokenType.Whitespace || token[0] === TokenType.Comment)
      continue;
    if (result) return;
    result = token;
  }
  return result;
}

/** @param {string} value @param {CSSToken} token @return {string} */
function tokenSource(value, token) {
  return value.slice(token[2], token[3] + 1);
}

/** @param {string} value @param {readonly CSSToken[]} input @param {NonNullable<ReturnType<typeof getBalancedTokens>>} structure @param {number} index @param {number} end @return {string | null} */
function reduceFunction(value, input, structure, index, end) {
  const name = asciiLowerCase(decoded(input[index]));
  const segments = structure.topLevelSegments(index + 1, end);
  if (name === 'cubic-bezier' && segments.length === 4) {
    const values = segments.map((segment) => {
      const token = singleToken(input, segment);
      return token?.[0] === TokenType.Number
        ? /** @type {{value: number}} */ (token[4]).value
        : Number.NaN;
    });
    return values.every((number) => !Number.isNaN(number))
      ? (conversions.get(values.toString()) ?? null)
      : null;
  }
  if (name !== 'steps' || segments.length !== 2) return null;
  const count = singleToken(input, segments[0]);
  if (
    !count ||
    count[0] !== TokenType.Number ||
    !Number.isInteger(/** @type {{value: number}} */ (count[4]).value) ||
    /** @type {{value: number}} */ (count[4]).value < 1
  )
    return null;
  const position = singleToken(input, segments[1]);
  if (!position || position[0] !== TokenType.Ident) return null;
  const positionName = asciiLowerCase(decoded(position));
  const countValue = /** @type {{value: number}} */ (count[4]).value;
  if (countValue === 1) {
    if (positionName === 'start' || positionName === 'jump-start')
      return 'step-start';
    if (positionName === 'end' || positionName === 'jump-end')
      return 'step-end';
  }
  return positionName === 'end' || positionName === 'jump-end'
    ? `steps(${tokenSource(value, count)})`
    : null;
}

/**
 * @param {string} value
 * @return {string}
 */
function transform(value) {
  const structure = getBalancedTokens(value);
  if (!structure) return value;
  const { tokens: input } = structure;
  /** @type {{start:number,end:number,text:string}[]} */
  const edits = [];
  for (let index = 0; index < input.length; index++) {
    if (input[index][0] !== TokenType.Function) continue;
    const end = structure.endForOpening(index);
    if (end === undefined) continue;
    const replacement = reduceFunction(value, input, structure, index, end);
    if (replacement)
      edits.push({
        start: input[index][2],
        end: input[end][3] + 1,
        text: replacement,
      });
  }
  let result = value;
  for (const edit of edits.toSorted((a, b) => b.start - a.start))
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  return result;
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-normalize-timing-functions',
    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      const cache = new Map();

      css.walkDecls(animationTransitionRegex, (decl) => {
        const value = decl.value;

        if (cache.has(value)) {
          decl.value = cache.get(value);

          return;
        }

        const result = transform(value);

        decl.value = result;
        cache.set(value, result);
      });
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
