import getBrowsersList from '#getBrowsersList';
import cssnanoUtils from 'cssnano-utils';

const { TokenType, balancedTokens, decoded, numeric, tokenEnd } = cssnanoUtils;
/** @import browserslist from 'browserslist' */

const openingTypes = new Set([
  TokenType.Function,
  TokenType.OpenParen,
  TokenType.OpenSquare,
  TokenType.OpenCurly,
]);
const closingTypes = new Set([
  TokenType.CloseParen,
  TokenType.CloseSquare,
  TokenType.CloseCurly,
]);
const aspectRatioFeatures = new Set([
  'aspect-ratio',
  'min-aspect-ratio',
  'max-aspect-ratio',
  'device-aspect-ratio',
  'min-device-aspect-ratio',
  'max-device-aspect-ratio',
]);

/** @param {bigint} a @param {bigint} b @return {bigint} */
function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

/**
 * Convert a CSS number spelling to an exact rational number.
 *
 * @param {string} source
 * @return {[bigint, bigint] | undefined}
 */
function rational(source) {
  const match = source.match(
    /^[+]?((?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE]([+-]?\d+))?$/
  );
  if (!match) return undefined;
  const [, coefficient, exponent = '0'] = match;
  const [whole, fraction = ''] = coefficient.split('.');
  const digits = `${whole}${fraction}`;
  let numerator = BigInt(digits);
  let denominator = 10n ** BigInt(fraction.length);
  if (numerator === 0n) return [0n, 1n];
  const power = BigInt(exponent);
  if (power > 10000n || power < -10000n) return undefined;
  if (power >= 0n) numerator *= 10n ** power;
  else denominator *= 10n ** -power;
  return [numerator, denominator];
}

/**
 * @param {string} left
 * @param {string} right
 * @return {[string, string] | undefined}
 */
function aspectRatio(left, right) {
  const a = rational(left);
  const b = rational(right);
  if (!a || !b) return undefined;
  const numerator = a[0] * b[1];
  const denominator = b[0] * a[1];
  if (numerator === 0n && denominator === 0n) return undefined;
  const divisor = gcd(numerator, denominator);
  const result = [String(numerator / divisor), String(denominator / divisor)];
  return result.join('/').length < left.length + right.length + 1
    ? /** @type {[string, string]} */ (result)
    : undefined;
}

/** @param {number} value @return {boolean} */
function isValidRatioComponent(value) {
  return Number.isFinite(value) && value >= 0;
}

/**
 * @param {unknown[]} items
 * @return {string}
 */
function sortAndDedupe(items) {
  const a = [...new Set(items)];
  a.sort();
  return a.join();
}

/**
 * @param {readonly {0:string,1:string,2:number,3:number,4:unknown}[]} input
 * @param {number} index
 * @param {number} step
 * @return {number}
 */
function significantIndex(input, index, step) {
  let cursor = index;
  while (
    input[cursor] &&
    (input[cursor][0] === TokenType.Whitespace ||
      input[cursor][0] === TokenType.Comment)
  ) {
    cursor += step;
  }
  return cursor;
}

/**
 * @param {string} source
 * @param {{start:number,end:number}[]} segments
 * @param {{start:number,end:number,text:string}[]} edits
 * @return {string[]}
 */
function serializeSegments(source, segments, edits) {
  let segmentIndex = 0;
  let previousEnd = -1;
  let previousEdit;
  for (const edit of edits) {
    if (
      previousEdit &&
      edit.start === previousEdit.start &&
      edit.end === previousEdit.end &&
      edit.text === previousEdit.text
    ) {
      continue;
    }
    while (
      segmentIndex < segments.length &&
      edit.start >= segments[segmentIndex].end
    ) {
      segmentIndex++;
    }
    const segment = segments[segmentIndex];
    if (
      !segment ||
      edit.start < segment.start ||
      edit.start < previousEnd ||
      edit.end < edit.start ||
      edit.end > segment.end
    ) {
      return segments.map(({ start, end }) => source.slice(start, end));
    }
    previousEnd = edit.end;
    previousEdit = edit;
  }
  let editIndex = 0;
  return segments.map(({ start, end }) => {
    let cursor = start;
    let result = '';
    while (editIndex < edits.length && edits[editIndex].start < end) {
      const edit = edits[editIndex++];
      if (edit.start < start || edit.start < cursor) continue;
      result += source.slice(cursor, edit.start) + edit.text;
      cursor = edit.end;
    }
    result += source.slice(cursor, end);
    return result;
  });
}

/** @param {ReturnType<typeof balancedTokens>} structure @return {(number|undefined)[]} */
function parentIndexes(structure) {
  if (!structure) return [];
  const parents = [];
  const stack = [];
  for (let i = 0; i < structure.tokens.length; i++) {
    const type = structure.tokens[i][0];
    parents[i] = stack.at(-1);
    if (openingTypes.has(type)) stack.push(i);
    else if (closingTypes.has(type)) stack.pop();
  }
  return parents;
}

/** @param {Exclude<ReturnType<typeof balancedTokens>, undefined>['tokens']} input @param {number} index @return {boolean} */
function isTightWhitespace(input, index) {
  const previous = input[index - 1];
  const next = input[index + 1];
  return [
    previous?.[0] === TokenType.Function,
    previous?.[0] === TokenType.OpenParen,
    next?.[0] === TokenType.CloseParen,
    previous?.[0] === TokenType.Comma,
    next?.[0] === TokenType.Comma,
    previous?.[0] === TokenType.Colon,
    next?.[0] === TokenType.Colon,
    previous?.[0] === TokenType.Delim,
    next?.[0] === TokenType.Delim,
  ].some(Boolean);
}

/** @param {Exclude<ReturnType<typeof balancedTokens>, undefined>['tokens']} input @param {number} name @param {number} colon @param {number} left @param {number} slash @param {number} right @param {number} after @param {number} close @return {boolean} */
function isAspectRatioFeature(
  input,
  name,
  colon,
  left,
  slash,
  right,
  after,
  close
) {
  const a = input[left] ? numeric(input[left]) : false;
  const b = input[right] ? numeric(input[right]) : false;
  const lowerName = name < close ? decoded(input[name]).toLowerCase() : '';
  return (
    input[name]?.[0] === TokenType.Ident &&
    aspectRatioFeatures.has(lowerName) &&
    input[colon]?.[0] === TokenType.Colon &&
    input[slash]?.[0] === TokenType.Delim &&
    input[slash][1] === '/' &&
    input[left]?.[0] === TokenType.Number &&
    input[right]?.[0] === TokenType.Number &&
    a &&
    b &&
    !a.unit &&
    !b.unit &&
    after === close
  );
}

/**
 * @param {Exclude<ReturnType<typeof balancedTokens>, undefined>} structure
 * @param {number} index
 * @param {(number|undefined)[]} parents
 * @return {{start:number,end:number,text:string}}
 */
function whitespaceEdit(structure, index, parents) {
  const input = structure.tokens;
  const token = input[index];
  const next = input[index + 1];
  const tight = isTightWhitespace(input, index);
  const open = parents[index];
  const first = open === undefined ? -1 : significantIndex(input, open + 1, 1);
  const colon = significantIndex(input, first + 1, 1);
  const close = open === undefined ? -1 : (structure.endForOpening(open) ?? -1);
  const emptyCustomProperty =
    next?.[0] === TokenType.CloseParen &&
    first >= 0 &&
    input[first][0] === TokenType.Ident &&
    decoded(input[first]).startsWith('--') &&
    input[colon]?.[0] === TokenType.Colon &&
    significantIndex(input, colon + 1, 1) === close;
  return {
    start: token[2],
    end: tokenEnd(token),
    text: tight && !emptyCustomProperty ? '' : ' ',
  };
}

/**
 * @param {Exclude<ReturnType<typeof balancedTokens>, undefined>} structure
 * @param {(number|undefined)[]} parents
 * @param {{start:number,end:number,text:string}[]} changes
 * @return {void}
 */
function minifyWhitespace(structure, parents, changes) {
  if (!structure) return;
  const { tokens: input } = structure;
  const existingRanges = new Set(
    changes.map((change) => `${change.start}:${change.end}`)
  );
  for (let i = 0; i < input.length; i++) {
    if (input[i][0] === TokenType.Whitespace) {
      const edit = whitespaceEdit(structure, i, parents);
      const range = `${edit.start}:${edit.end}`;
      if (!existingRanges.has(range)) {
        changes.push(edit);
        existingRanges.add(range);
      }
    }
  }
}

/**
 * @param {Exclude<ReturnType<typeof balancedTokens>, undefined>['tokens']} input
 * @param {(number|undefined)[]} parents
 * @param {number} index
 * @return {boolean}
 */
function isGroupingParent(input, parents, index) {
  let parent = parents[index];
  while (parent !== undefined) {
    if (input[parent][0] !== TokenType.OpenParen) return false;
    parent = parents[parent];
  }
  return true;
}

/**
 * @param {boolean} supports
 * @param {Exclude<ReturnType<typeof balancedTokens>, undefined>} structure
 * @param {(number|undefined)[]} parents
 * @param {{start:number,end:number,text:string}[]} changes
 * @return {void}
 */
function minifyAspectRatios(supports, structure, parents, changes) {
  if (!structure) return;
  const { tokens: input } = structure;
  for (let open = 0; open < input.length; open++) {
    if (
      input[open][0] !== TokenType.OpenParen ||
      (supports
        ? !isGroupingParent(input, parents, open)
        : parents[open] !== undefined)
    )
      continue;
    const close = structure.endForOpening(open);
    if (close === undefined) continue;
    const name = significantIndex(input, open + 1, 1);
    const colon = significantIndex(input, name + 1, 1);
    const left = significantIndex(input, colon + 1, 1);
    const slash = significantIndex(input, left + 1, 1);
    const right = significantIndex(input, slash + 1, 1);
    const after = significantIndex(input, right + 1, 1);
    if (
      !isAspectRatioFeature(
        input,
        name,
        colon,
        left,
        slash,
        right,
        after,
        close
      )
    )
      continue;
    const a = numeric(input[left]);
    const b = numeric(input[right]);
    if (
      !a ||
      !b ||
      !isValidRatioComponent(a.number) ||
      !isValidRatioComponent(b.number) ||
      (a.number === 0 && b.number === 0)
    )
      continue;
    const ratio = aspectRatio(input[left][1], input[right][1]);
    if (!ratio) continue;
    const [x, y] = ratio;
    changes.push(
      { start: input[left][2], end: tokenEnd(input[left]), text: String(x) },
      { start: input[right][2], end: tokenEnd(input[right]), text: String(y) }
    );
  }
}

/** @param {Exclude<ReturnType<typeof balancedTokens>, undefined>['tokens']} input @param {{startIndex:number,endIndex:number}} segment @return {{endIndex:number,first:number,last:number}} */
function mediaSegmentInfo(input, { startIndex, endIndex }) {
  const first = significantIndex(input, startIndex, 1);
  let last = endIndex - 1;
  while (
    last >= first &&
    (input[last][0] === TokenType.Whitespace ||
      input[last][0] === TokenType.Comment)
  ) {
    last--;
  }
  return { endIndex, first, last };
}

/** @param {Exclude<ReturnType<typeof balancedTokens>, undefined>['tokens']} input @param {{first:number,last:number}} segment @return {boolean} */
function isStandaloneAll(input, { first, last }) {
  return (
    first === last &&
    input[first]?.[0] === TokenType.Ident &&
    decoded(input[first]).toLowerCase() === 'all'
  );
}

/** @param {boolean} legacy @param {Exclude<ReturnType<typeof balancedTokens>, undefined>['tokens']} input @param {{endIndex:number,first:number}} segment @param {{start:number,end:number,text:string}[]} changes @return {void} */
function minifyMediaAllSegment(legacy, input, { endIndex, first }, changes) {
  if (
    input[first]?.[0] !== TokenType.Ident ||
    decoded(input[first]).toLowerCase() !== 'all'
  )
    return;
  const second = significantIndex(input, first + 1, 1);
  const and =
    second < endIndex &&
    input[second]?.[0] === TokenType.Ident &&
    decoded(input[second]).toLowerCase() === 'and';
  if (legacy && !and) return;
  const end = and ? second : first;
  for (let i = first; i <= end; i++) {
    if (
      input[i][0] === TokenType.Ident ||
      input[i][0] === TokenType.Whitespace
    ) {
      changes.push({
        start: input[i][2],
        end: tokenEnd(input[i]),
        text: '',
      });
    }
  }
  const trailing = end + 1;
  if (trailing < endIndex && input[trailing]?.[0] === TokenType.Whitespace) {
    changes.push({
      start: input[trailing][2],
      end: tokenEnd(input[trailing]),
      text: '',
    });
  }
}

/**
 * @param {boolean} legacy
 * @param {Exclude<ReturnType<typeof balancedTokens>, undefined>} structure
 * @param {{start:number,end:number,text:string}[]} changes
 * @return {boolean}
 */
function minifyMediaAll(legacy, structure, changes) {
  if (!structure) return false;
  const { tokens: input } = structure;
  const ranges = structure
    .topLevelSegments()
    .map((segment) => mediaSegmentInfo(input, segment));

  if (!legacy && ranges.some((segment) => isStandaloneAll(input, segment))) {
    const last = input.at(-1);
    if (last) changes.push({ start: 0, end: tokenEnd(last), text: '' });
    return true;
  }

  for (const segment of ranges)
    minifyMediaAllSegment(legacy, input, segment, changes);
  return false;
}

/**
 * @param {boolean} legacy
 * @param {import('postcss').AtRule} rule
 * @return {void}
 */
function transform(legacy, rule) {
  const ruleName = rule.name.toLowerCase();

  // We should re-arrange parameters only for `@media` and `@supports` at-rules
  if (!rule.params || !['media', 'supports'].includes(ruleName)) {
    return;
  }

  const source =
    rule.raws.params?.value === rule.params
      ? (rule.raws.params.raw ?? rule.params)
      : rule.params;
  const structure = balancedTokens(source);
  if (!structure) {
    if (rule.raws.params?.raw) {
      rule.raws.params = { raw: rule.params, value: rule.params };
    }
    return;
  }
  /** @type {{start:number,end:number,text:string}[]} */
  const changes = [];
  const parents = parentIndexes(structure);
  const mediaIsUnconditional =
    ruleName === 'media' && minifyMediaAll(legacy, structure, changes);
  if (mediaIsUnconditional) {
    rule.params = '';
    if (rule.raws.params?.raw) rule.raws.params = { raw: '', value: '' };
    rule.raws.afterName = '';
    return;
  }
  minifyWhitespace(structure, parents, changes);
  minifyAspectRatios(ruleName === 'supports', structure, parents, changes);
  const { tokens: input } = structure;
  const segmentRanges = structure
    .topLevelSegments()
    .map(({ startIndex, endIndex }) => {
      const start = input[startIndex]?.[2] ?? source.length;
      const end = endIndex > startIndex ? tokenEnd(input[endIndex - 1]) : start;
      return { start, end };
    });
  changes.sort((a, b) => a.start - b.start);
  const segments = serializeSegments(source, segmentRanges, changes);
  rule.params = sortAndDedupe(segments);
  if (rule.raws.params?.raw) {
    rule.raws.params = { raw: rule.params, value: rule.params };
  }

  if (!rule.params.length) {
    rule.raws.afterName = '';
  }
}

const allBugBrowers = new Set(['ie 10', 'ie 11']);

/**
 * @typedef {{ overrideBrowserslist?: string | string[] }} AutoprefixerOptions
 * @typedef {Pick<browserslist.Options, 'stats' | 'path' | 'env'>} BrowserslistOptions
 * @typedef {AutoprefixerOptions & BrowserslistOptions} Options
 */

/**
 * @type {import('postcss').PluginCreator<Options>}
 * @param {Options} options
 * @return {import('postcss').Plugin}
 */
function pluginCreator(options = {}) {
  return {
    postcssPlugin: 'postcss-minify-params',

    /**
     * @param {import('postcss').Result & {opts: BrowserslistOptions & {file?: string}}} result
     */
    prepare(result) {
      const { stats, env, from, file } = result.opts || {};
      const browsers = getBrowsersList(options, stats, from, file, env);

      const hasAllBug = !new Set(browsers).isDisjointFrom(allBugBrowers);

      return {
        /**
         * @param {import('postcss').Root} css
         */
        OnceExit(css) {
          css.walkAtRules((rule) => transform(hasAllBug, rule));
        },
      };
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };
