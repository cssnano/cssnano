import cssnanoUtils from 'cssnano-utils';
import isColorStop from './isColorStop.js';

const { TokenType, applyEdits, decoded, numeric, tokenEnd } = cssnanoUtils;
/** @type {typeof cssnanoUtils.balancedTokens} */
const balancedTokens = cssnanoUtils.balancedTokens;

const directions = new Map([
  ['top', '0deg'],
  ['right', '90deg'],
  ['bottom', '180deg'],
  ['left', '270deg'],
]);
const gradientNames = new Set([
  'linear-gradient',
  'repeating-linear-gradient',
  '-webkit-linear-gradient',
  '-webkit-repeating-linear-gradient',
  'radial-gradient',
  'repeating-radial-gradient',
  'conic-gradient',
  'repeating-conic-gradient',
  '-webkit-radial-gradient',
  '-webkit-repeating-radial-gradient',
]);
/** @typedef {ReturnType<typeof balancedTokens> extends infer Structure ? Structure extends {tokens: readonly (infer Token)[]} ? Token : never : never} CSSToken */
/** @param {readonly CSSToken[]} input @param {NonNullable<ReturnType<typeof balancedTokens>>} structure @param {{startIndex: number, endIndex: number}} range */
function significant(input, structure, range) {
  const result = [];
  for (let index = range.startIndex; index < range.endIndex; index++) {
    const token = input[index];
    if (token[0] !== TokenType.Whitespace && token[0] !== TokenType.Comment) {
      result.push(token);
    }
    const frameEnd = structure.endForOpening(index);
    if (frameEnd !== undefined) index = frameEnd;
  }
  return result;
}
/** @param {CSSToken} token */
function unit(token) {
  return numeric(token);
}

/** @param {import('postcss').Declaration} decl */
// A single pass keeps related gradient-stop rewrites ordered by their source offsets.
// eslint-disable-next-line complexity
function optimise(decl) {
  const source = decl.value;
  if (
    !source ||
    /\b(?:var|env)\s*\(/i.test(source) ||
    !source.toLowerCase().includes('gradient')
  )
    return;
  const structure = balancedTokens(source);
  if (!structure) return;
  const { tokens: input } = structure;
  const tokenIndexes = new Map(input.map((token, index) => [token, index]));
  /** @type {{start:number,end:number,text:string,priority?:number}[]} */
  const replacements = [];
  // Visit nested gradients as the token walker does; their ranges are already
  // available from the shared delimiter map.
  for (let index = 0; index < input.length; index++) {
    const token = input[index];
    if (
      token[0] !== TokenType.Function ||
      !gradientNames.has(decoded(token).toLowerCase())
    )
      continue;
    const end = structure.endForOpening(index);
    if (end === undefined) continue;
    const args = structure.topLevelSegments(index + 1, end);
    const first = significant(input, structure, args[0]);
    if (
      decoded(token).toLowerCase().includes('linear') &&
      first.length === 2 &&
      first[0][0] === TokenType.Ident &&
      first[1][0] === TokenType.Ident &&
      decoded(first[0]).toLowerCase() === 'to'
    ) {
      const direction = directions.get(decoded(first[1]).toLowerCase());
      if (direction) {
        const text = direction;
        replacements.push({
          start: first[0][2],
          end: tokenEnd(first[1]),
          text,
        });
      }
    }
    let largest;
    let seen = false;
    let started = false;
    const stops = [];
    for (const range of args) {
      const parts = significant(input, structure, range);
      if (!parts.length) continue;
      let colorEnd = parts[0][3];
      if (parts[0][0] === TokenType.Function) {
        const colorIndex = tokenIndexes.get(parts[0]);
        const matchingColor =
          colorIndex === undefined
            ? undefined
            : structure.endForOpening(colorIndex);
        if (matchingColor !== undefined) colorEnd = input[matchingColor][3];
      }
      const color = source.slice(parts[0][2], colorEnd + 1).toLowerCase();
      const stop =
        isColorStop(color) ||
        (parts[0][0] === TokenType.Function &&
          !['calc', 'clamp', 'max', 'min'].includes(
            decoded(parts[0]).toLowerCase()
          ));
      /** @type {CSSToken[]} */
      let position = [];
      if (stop) {
        position = parts.slice(1);
      } else if (parts.length) {
        position = parts;
      }
      if (stop) {
        started = true;
        stops.push({ parts, position, colorEnd });
        seen = true;
        if (!position.length && !largest) largest = { number: 0, unit: '%' };
      }
      if (!started) continue;
      for (const item of position) {
        const current = unit(item);
        if (
          !current ||
          (largest &&
            current.unit.toLowerCase() !== largest.unit.toLowerCase() &&
            current.number !== 0 &&
            largest.number !== 0)
        ) {
          largest = undefined;
          continue;
        }
        if (largest && largest.number >= current.number)
          replacements.push({ start: item[2], end: tokenEnd(item), text: '0' });
        else largest = current;
      }
    }
    if (seen) {
      for (const stop of [stops[0], stops.at(-1)]) {
        if (!stop) continue;
        const position = stop?.position;
        if (
          position?.length === 1 &&
          ((stop === stops[0] && position[0][1] === '0%') ||
            (stop === stops.at(-1) && position[0][1] === '100%'))
        )
          replacements.push({
            start: stop.colorEnd + 1,
            end: tokenEnd(position[0]),
            text: '',
            priority: 1,
          });
      }
    }
  }
  decl.value = applyEdits(source, replacements);
}

/** @return {import('postcss').Plugin} */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-minify-gradients',
    OnceExit(css) {
      css.walkDecls(optimise);
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
export { pluginCreator as default, pluginCreator as 'module.exports' };
