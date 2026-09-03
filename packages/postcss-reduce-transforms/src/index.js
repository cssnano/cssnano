import { tokenize, TokenType } from '@csstools/css-tokenizer';

/** @param {import('@csstools/css-tokenizer').CSSToken} token @return {string} */
const decoded = (token) => {
  const value = /** @type {{value?: unknown}} */ (token[4])?.value;
  return typeof value === 'string' ? value : token[1];
};

const transformRegex = /transform$/i;

/** @param {import('@csstools/css-tokenizer').CSSToken} token @return {boolean} */
function isBlockStart(token) {
  return (
    token[0] === TokenType.Function ||
    token[0] === TokenType.OpenParen ||
    token[0] === TokenType.OpenSquare ||
    token[0] === TokenType.OpenCurly
  );
}
/** @param {import('@csstools/css-tokenizer').CSSToken} token @return {boolean} */
function isBlockEnd(token) {
  return (
    token[0] === TokenType.CloseParen ||
    token[0] === TokenType.CloseSquare ||
    token[0] === TokenType.CloseCurly
  );
}
/** @param {import('@csstools/css-tokenizer').TokenType} type @return {import('@csstools/css-tokenizer').TokenType} */
function matchingOpen(type) {
  if (type === TokenType.CloseSquare) return TokenType.OpenSquare;
  if (type === TokenType.CloseCurly) return TokenType.OpenCurly;
  return TokenType.Function;
}
/** @param {import('@csstools/css-tokenizer').TokenType} type @param {import('@csstools/css-tokenizer').TokenType} open @return {boolean} */
function closes(type, open) {
  return type === TokenType.CloseParen
    ? open === TokenType.Function || open === TokenType.OpenParen
    : matchingOpen(type) === open;
}
/** @param {string} name @return {string} */
function normalizeReducerName(name) {
  const lower = name.toLowerCase();
  return lower === 'rotatez' ? 'rotateZ' : lower;
}

/** @param {{start:number,end:number,significant:number[]}} argument @param {string} value @param {import('@csstools/css-tokenizer').CSSToken[]} tokens @param {Map<number, number>} blockEnds @return {string} */
function argumentSource(argument, value, tokens, blockEnds) {
  if (argument.significant.length === 0) return '';
  const first = argument.significant[0];
  const last = argument.significant[argument.significant.length - 1];
  const end = isBlockStart(tokens[last])
    ? tokens[blockEnds.get(first) ?? first][3] + 1
    : tokens[last][3] + 1;
  return value.slice(tokens[first][2], end);
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

/** @param {string} name @param {(number|string)[]} values @param {(...indices: number[]) => string} select */
function reduceRotation(name, values, select) {
  if (name === 'rotate3d' && values.length === 4) {
    let match;
    if (values[0] === 1 && values[1] === 0 && values[2] === 0)
      match = 'rotateX';
    else if (values[0] === 0 && values[1] === 1 && values[2] === 0)
      match = 'rotateY';
    else if (values[0] === 0 && values[1] === 0 && values[2] === 1)
      match = 'rotate';
    return match ? `${match}(${select(3)})` : undefined;
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
    if (values[1] === 1 && values[2] === 1) return `scaleX(${select(0)})`;
    if (values[0] === 1 && values[2] === 1) return `scaleY(${select(1)})`;
    if (values[0] === 1 && values[1] === 1) return `scaleZ(${select(2)})`;
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

/** @param {string} name @param {(number|string)[]} values @param {(...indices: number[]) => string} select @return {string | undefined} */
function reducedTransform(name, values, select) {
  if (name === 'matrix3d') return reduceMatrix(values, select);
  if (name === 'rotate3d' || name === 'rotateZ')
    return reduceRotation(name, values, select);
  if (name === 'scale' || name === 'scale3d')
    return reduceScale(name, values, select);
  if (name === 'translate' || name === 'translate3d')
    return reduceTranslation(name, values, select);
  return undefined;
}

/** @param {{open:number,close:number,name:string,args:{start:number,end:number,significant:number[]}[]}} frame @param {(number|string)[]} values @param {string} value @param {import('@csstools/css-tokenizer').CSSToken[]} tokens @param {Map<number, number>} blockEnds @return {[number, number, string] | undefined} */
function reduce(frame, values, value, tokens, blockEnds) {
  const { args } = frame;
  const name = normalizeReducerName(frame.name);
  /** @param {{start:number,end:number,significant:number[]}} argument */
  const sourceEnd = (argument) => {
    const index = argument.significant[argument.significant.length - 1];
    if (index === undefined) return argument.start;
    if (isBlockStart(tokens[index]))
      return tokens[blockEnds.get(index) ?? index][3] + 1;
    return tokens[index][3] + 1;
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
    : [tokens[frame.open][2], tokens[frame.close][3] + 1, out];
}

/** @param {string} value @return {string} */
function transform(value) {
  /** @type {import('@csstools/css-tokenizer').CSSToken[]} */ const tokens = [
    ...tokenize({ css: value }),
  ];
  /** @type {{open:number,close:number,name:string,args:{start:number,end:number,significant:number[]}[]}[]} */ const functions =
    [];
  /** @type {Map<number, {open:number,close:number,name:string,args:{start:number,end:number,significant:number[]}[]}>} */
  const functionsByOpen = new Map();
  /** @type {Map<number, number>} */ const blockEnds = new Map();
  /** @type {{type:import('@csstools/css-tokenizer').TokenType,index:number}[]} */ const stack =
    [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (isBlockStart(token)) {
      stack.push({
        type: token[0] === TokenType.Function ? TokenType.Function : token[0],
        index: i,
      });
      if (token[0] === TokenType.Function) {
        const frame = {
          open: i,
          close: -1,
          name: decoded(token),
          args: [],
        };
        functions.push(frame);
        functionsByOpen.set(i, frame);
      }
    } else if (isBlockEnd(token)) {
      const entry = stack.at(-1);
      if (!entry || !closes(token[0], entry.type)) continue;
      stack.pop();
      blockEnds.set(entry.index, i);
      if (entry.type === TokenType.Function) {
        const frame = functionsByOpen.get(entry.index);
        if (frame) frame.close = i;
      }
    }
  }
  /** @type {[number, number, string][]} */ const replacements = [];
  for (const frame of functions.toReversed()) {
    if (frame.close < 0) continue;
    /** @type {number[]} */ const direct = [];
    for (let i = frame.open + 1; i < frame.close; i++) {
      const end = blockEnds.get(i);
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
        return argumentSource(inner, value, tokens, blockEnds);
      }
      if (token[0] === TokenType.Function || isBlockStart(token))
        return Number.NaN;
      return Number.parseFloat(token[1]);
    });
    const edit = reduce(frame, values, value, tokens, blockEnds);
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
