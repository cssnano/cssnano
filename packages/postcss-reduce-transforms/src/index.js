import cssnanoUtils from 'cssnano-utils';

const { TokenType, balancedTokens, decoded, tokenEnd, tokenStart } =
  cssnanoUtils;

const transformRegex = /transform$/i;

/** @param {string} name @return {string} */
function normalizeReducerName(name) {
  const lower = name.toLowerCase();
  return lower === 'rotatez' ? 'rotateZ' : lower;
}

/** @param {{start:number,end:number,significant:number[]}} argument @param {string} value @param {readonly import('@csstools/css-tokenizer').CSSToken[]} tokens @param {NonNullable<ReturnType<typeof balancedTokens>>} structure @return {string} */
function argumentSource(argument, value, tokens, structure) {
  if (argument.significant.length === 0) return '';
  const first = argument.significant[0];
  const last = argument.significant[argument.significant.length - 1];
  const end = structure.endForOpening(first);
  return value.slice(
    tokenStart(tokens[first]),
    end !== undefined ? tokenEnd(tokens[end]) : tokenEnd(tokens[last])
  );
}

/** @param {(number|string)[]} values @param {(...indices: number[]) => string} select */
function reduceMatrix(values, select) {
  if (values.length !== 16) return undefined;
  return values[2] === 0 &&
    values[3] === 0 &&
    values[6] === 0 &&
    values[7] === 0 &&
    values[8] === 0 &&
    values[9] === 0 &&
    values[10] === 1 &&
    values[11] === 0 &&
    values[14] === 0 &&
    values[15] === 1
    ? `matrix(${select(0, 1, 4, 5, 12, 13)})`
    : undefined;
}

/**
 * Declarative 3D vector reduction tables.
 * Each entry specifies the exact axis pattern to match and the target function.
 */
const rotate3dAxes = [
  { match: [1, 0, 0], target: 'rotateX' },
  { match: [0, 1, 0], target: 'rotateY' },
  { match: [0, 0, 1], target: 'rotate' },
];

const scale3dAxes = [
  { match: [null, 1, 1], target: 'scaleX', index: 0 },
  { match: [1, null, 1], target: 'scaleY', index: 1 },
  { match: [1, 1, null], target: 'scaleZ', index: 2 },
];

/** @param {string} name @param {(number|string)[]} values @param {(...indices: number[]) => string} select */
function reduceRotation(name, values, select) {
  if (name === 'rotate3d' && values.length === 4) {
    for (const { match, target } of rotate3dAxes) {
      if (
        values[0] === match[0] &&
        values[1] === match[1] &&
        values[2] === match[2]
      ) {
        return `${target}(${select(3)})`;
      }
    }
    return undefined;
  }
  if (name === 'rotateZ' && values.length === 1) return `rotate(${select(0)})`;
  return undefined;
}

/** @param {string} name @param {(number|string)[]} values @param {(...indices: number[]) => string} select */
function reduceScale(name, values, select) {
  if (name === 'scale' && values.length === 2) {
    if (values[0] === values[1]) return `scale(${select(0)})`;
    if (values[1] === 1) return `scaleX(${select(0)})`;
    if (values[0] === 1) return `scaleY(${select(1)})`;
  }
  if (name === 'scale3d' && values.length === 3) {
    for (const { match, target, index } of scale3dAxes) {
      if (
        (match[0] === null || values[0] === match[0]) &&
        (match[1] === null || values[1] === match[1]) &&
        (match[2] === null || values[2] === match[2])
      ) {
        return `${target}(${select(index)})`;
      }
    }
  }
  return undefined;
}

/** @param {string} name @param {(number|string)[]} values @param {(...indices: number[]) => string} select */
function reduceTranslation(name, values, select) {
  if (name === 'translate' && values.length === 2) {
    if (values[1] === 0) return `translate(${select(0)})`;
    if (values[0] === 0) return `translateY(${select(1)})`;
  }
  if (
    name === 'translate3d' &&
    values.length === 3 &&
    values[0] === 0 &&
    values[1] === 0
  )
    return `translateZ(${select(2)})`;
  return undefined;
}

/** @type {Map<string, (values: (number|string)[], select: (...indices: number[]) => string) => string | undefined>} */
const reducers = new Map([
  ['matrix3d', reduceMatrix],
  ['rotate3d', (values, select) => reduceRotation('rotate3d', values, select)],
  ['rotateZ', (values, select) => reduceRotation('rotateZ', values, select)],
  ['scale', (values, select) => reduceScale('scale', values, select)],
  ['scale3d', (values, select) => reduceScale('scale3d', values, select)],
  [
    'translate',
    (values, select) => reduceTranslation('translate', values, select),
  ],
  [
    'translate3d',
    (values, select) => reduceTranslation('translate3d', values, select),
  ],
]);

/** @param {string} name @param {(number|string)[]} values @param {(...indices: number[]) => string} select @return {string | undefined} */
function reducedTransform(name, values, select) {
  const reducer = reducers.get(name);
  return reducer ? reducer(values, select) : undefined;
}

/** @param {{open:number,close:number,name:string,args:{start:number,end:number,significant:number[]}[]}} frame @param {(number|string)[]} values @param {string} value @param {readonly import('@csstools/css-tokenizer').CSSToken[]} tokens @param {NonNullable<ReturnType<typeof balancedTokens>>} structure @return {[number, number, string] | undefined} */
function reduce(frame, values, value, tokens, structure) {
  const { args } = frame;
  const name = normalizeReducerName(frame.name);
  /** @param {{start:number,end:number,significant:number[]}} argument */
  const sourceEnd = (argument) => {
    const index = argument.significant[argument.significant.length - 1];
    if (index === undefined) return argument.start;
    const end = structure.endForOpening(index);
    if (end !== undefined) return tokenEnd(tokens[end]);
    return tokenEnd(tokens[index]);
  };
  /** @param {{start:number,end:number,significant:number[]}} argument */
  const sourceStart = (argument) =>
    argument.significant.length
      ? tokens[argument.significant[0]][2]
      : argument.end;
  /** @param {number} index */
  const separatorAfter = (index) => {
    let end = sourceEnd(args[index]);
    for (let i = args[index].end; i < frame.close; i++) {
      end = tokens[i][3] + 1;
      if (tokens[i][0] === TokenType.Comma) {
        while (i + 1 < frame.close && tokens[i + 1][0] === TokenType.Whitespace)
          end = tokens[++i][3] + 1;
        break;
      }
    }
    return value.slice(sourceEnd(args[index]), end);
  };
  /** @param {...number} indices */
  const select = (...indices) =>
    indices
      .map(
        (i, position) =>
          value.slice(sourceStart(args[i]), sourceEnd(args[i])) +
          (position === indices.length - 1 ? '' : separatorAfter(i))
      )
      .join('');
  const out = reducedTransform(name, values, select);
  return out === undefined
    ? undefined
    : [tokenStart(tokens[frame.open]), tokenEnd(tokens[frame.close]), out];
}

/** @param {string} value @return {string} */
function transform(value) {
  const structure = balancedTokens(value);
  if (!structure) return value;
  const { tokens } = structure;
  /** @type {{open:number,close:number,name:string,args:{start:number,end:number,significant:number[]}[]}[]} */
  const functions = [];
  /** @type {Map<number, {open:number,close:number,name:string,args:{start:number,end:number,significant:number[]}[]}>} */
  const functionsByOpen = new Map();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token[0] === TokenType.Function) {
      const close = structure.endForOpening(i);
      if (close === undefined) continue;
      const frame = {
        open: i,
        close,
        name: decoded(token),
        args: [],
      };
      functions.push(frame);
      functionsByOpen.set(i, frame);
    }
  }

  /** @type {[number, number, string][]} */ const replacements = [];
  for (const frame of functions.toReversed()) {
    /** @type {number[]} */ const direct = [];
    for (let i = frame.open + 1; i < frame.close; i++) {
      const end = structure.endForOpening(i);
      if (end !== undefined) {
        direct.push(i);
        i = end;
        continue;
      }
      direct.push(i);
    }
    /** @type {number[][]} */ const parts = [[]];
    for (const i of direct) {
      if (tokens[i][0] === TokenType.Comma) parts.push([]);
      else if (
        tokens[i][0] !== TokenType.Whitespace &&
        tokens[i][0] !== TokenType.EOF
      )
        parts[parts.length - 1].push(i);
    }
    frame.args = parts.map((significant) => ({
      start: significant[0] ?? frame.open + 1,
      end:
        significant.length === 0
          ? frame.close
          : significant[significant.length - 1] + 1,
      significant,
    }));
    const values = frame.args.map((argument) => {
      if (argument.significant.length !== 1) return Number.NaN;
      const index = argument.significant[0];
      const token = tokens[index];
      const child = functionsByOpen.get(index);
      if (
        child &&
        (child.name === 'var' || child.name === 'env') &&
        child.args.length === 1 &&
        child.args[0].significant.length === 1
      ) {
        const inner = child.args[0];
        return argumentSource(inner, value, tokens, structure);
      }
      if (
        token[0] === TokenType.Function ||
        structure.endForOpening(index) !== undefined
      )
        return Number.NaN;
      return Number.parseFloat(token[1]);
    });
    const edit = reduce(frame, values, value, tokens, structure);
    if (edit) replacements.push(edit);
  }
  let result = value;
  for (const [start, end, text] of replacements.toSorted((a, b) => b[0] - a[0]))
    result = result.slice(0, start) + text + result.slice(end);
  return result;
}

/** @return {import('postcss').Plugin} */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-reduce-transforms',
    prepare() {
      const cache = new Map();
      return {
        OnceExit(css) {
          css.walkDecls(transformRegex, (decl) => {
            const value =
              decl.raws.value?.value === decl.value
                ? (decl.raws.value.raw ?? decl.value)
                : decl.value;
            if (!value) return;
            if (!value.includes('(')) {
              assignValue(decl, value);
              cache.set(value, value);
              return;
            }
            if (cache.has(value)) {
              assignValue(decl, cache.get(value));
              return;
            }
            const result = transform(value);
            assignValue(decl, result);
            cache.set(value, result);
          });
        },
      };
    },
  };
}

/** @param {import('postcss').Declaration} decl @param {string} value */
function assignValue(decl, value) {
  decl.value = value;
  if (decl.raws.value?.raw) decl.raws.value = { raw: value, value };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;
export { moduleExports as default, moduleExports as 'module.exports' };
