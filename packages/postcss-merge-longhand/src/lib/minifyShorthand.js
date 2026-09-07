import cssnanoUtils from 'cssnano-utils';
import stylehacks from 'stylehacks';
import shorthandData from '../data/shorthandIdentities.json' with { type: 'json' };
import cssGlobalKeywords from './cssGlobalKeywords.js';
import { splitValue } from './valueComponents.js';

const { TokenType, decoded, lengthUnits, numeric, tokenEnd, tokenStart } =
  cssnanoUtils;

const openingTokens = new Map([
  [TokenType.Function, TokenType.CloseParen],
  [TokenType.OpenParen, TokenType.CloseParen],
  [TokenType.OpenSquare, TokenType.CloseSquare],
  [TokenType.OpenCurly, TokenType.CloseCurly],
]);

const closingTokens = new Set([
  TokenType.CloseParen,
  TokenType.CloseSquare,
  TokenType.CloseCurly,
]);

const substitutionFunctions = new Set(['var', 'env', 'constant', 'attr']);
const valueFunctions = new Set([
  'calc',
  'min',
  'max',
  'clamp',
  'round',
  'mod',
  'rem',
  'abs',
  'sign',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'pow',
  'sqrt',
  'hypot',
  'log',
  'exp',
  'anchor-size',
]);

const overflowKeywords = new Set([
  'visible',
  'hidden',
  'clip',
  'scroll',
  'auto',
]);
const overscrollKeywords = new Set(['auto', 'contain', 'none']);
const gapKeywords = new Set(['normal']);
const alignmentForms = new Map(
  Object.entries(shorthandData.alignment).map(([property, forms]) => [
    property,
    new Set(forms),
  ])
);
const timingKeywords = new Set(shorthandData.easing.keywords);
const timingFunctions = new Set(shorthandData.easing.functions);
const transitionTimeUnits = new Set(['ms', 's']);

/** @typedef {{name: string | null, expected: import('@csstools/css-tokenizer').TokenType, commas: number, hasValue: boolean}} FunctionFrame */

/**
 * @typedef {{raw: string, tokens: import('@csstools/css-tokenizer').CSSToken[]}}
 *   Component
 */

/** @param {import('@csstools/css-tokenizer').CSSToken} token @return {string} */
function tokenName(token) {
  return decoded(token).toLowerCase();
}

/** @param {Component} component @return {string} */
function componentName(component) {
  const token = component.tokens[0];
  if (!token) return '';
  return token[0] === TokenType.Ident || token[0] === TokenType.Function
    ? tokenName(token)
    : '';
}

/**
 * Return a semantic comparison key without reserializing the component. Raw
 * source is still used for output; decoding is only for classification and
 * equality of case-insensitive CSS tokens.
 *
 * @param {Component} component
 * @return {string}
 */
function componentKey(component) {
  return component.tokens
    .map((token) => {
      const value = numeric(token);
      if (value) {
        return `numeric:${token[0]}:${value.number}:${value.unit.toLowerCase()}`;
      }
      if (token[0] === TokenType.Whitespace) return 'whitespace';
      if (token[0] === TokenType.Ident || token[0] === TokenType.Function) {
        return `${token[0]}:${tokenName(token)}`;
      }
      return `${token[0]}:${token[1]}`;
    })
    .join('|');
}

/** @param {Component} component @return {boolean} */
function hasCssWideKeyword(component) {
  return component.tokens.some(
    (token) =>
      token[0] === TokenType.Ident && cssGlobalKeywords.has(tokenName(token))
  );
}

/**
 * Check function names recursively. Detailed value grammar belongs to the
 * individual reducer; rejecting unknown and substitution functions here keeps
 * every reducer conservative without losing raw function spelling.
 *
 * @param {Component} component
 * @param {Set<string>} allowed
 * @return {boolean}
 */
function hasAllowedFunctions(component, allowed) {
  /** @type {FunctionFrame[]} */
  const stack = [];
  for (const token of component.tokens) {
    if (token[0] === TokenType.Function) {
      const name = tokenName(token);
      if (!pushFunctionFrame(stack, name, allowed)) return false;
    } else if (openingTokens.has(token[0])) {
      if (!pushBlockFrame(stack, token[0])) return false;
    } else if (token[0] === TokenType.Whitespace) {
      continue;
    } else if (token[0] === TokenType.Comma) {
      if (!consumeFunctionComma(stack)) return false;
    } else if (closingTokens.has(token[0])) {
      if (!consumeFunctionCloser(stack, token[0])) return false;
    } else {
      const frame = stack.at(-1);
      if (!frame) return false;
      frame.hasValue = true;
    }
  }
  if (stack.length) return false;
  return hasValidFunctionSyntax(component.tokens);
}

/** @param {FunctionFrame[]} stack @param {string} name @param {Set<string>} allowed @return {boolean} */
function pushFunctionFrame(stack, name, allowed) {
  if (substitutionFunctions.has(name) || !allowed.has(name)) return false;
  stack.push({
    name,
    expected: TokenType.CloseParen,
    commas: 0,
    hasValue: false,
  });
  return true;
}

/** @param {FunctionFrame[]} stack @param {import('@csstools/css-tokenizer').TokenType} type @return {boolean} */
function pushBlockFrame(stack, type) {
  const expected = openingTokens.get(type);
  if (expected === undefined) return false;
  stack.push({ name: null, expected, commas: 0, hasValue: false });
  return true;
}

/** @param {FunctionFrame[]} stack @return {boolean} */
function consumeFunctionComma(stack) {
  const frame = stack.at(-1);
  if (!frame?.name || !frame.hasValue) return false;
  frame.commas++;
  frame.hasValue = false;
  return true;
}

/** @param {FunctionFrame[]} stack @param {import('@csstools/css-tokenizer').TokenType} type @return {boolean} */
function consumeFunctionCloser(stack, type) {
  const frame = stack.pop();
  if (!frame || frame.expected !== type || !frame.hasValue) return false;
  if (!functionArityIsValid(frame.name, frame.commas + 1)) return false;
  const parent = stack.at(-1);
  if (parent) parent.hasValue = true;
  return true;
}

/** @param {import('@csstools/css-tokenizer').CSSToken[]} input @return {boolean} */
function hasValidFunctionSyntax(input) {
  for (let index = 0; index < input.length; index++) {
    const token = input[index];
    if (token[0] === TokenType.Delim && isMathOperator(token[1])) {
      if (operatorHasNoOperand(input, index)) return false;
    } else if (
      token[0] === TokenType.Comma &&
      commaHasNoOperand(input, index)
    ) {
      return false;
    }
  }
  return true;
}

/** @param {string} value @return {boolean} */
function isMathOperator(value) {
  return ['+', '-', '*', '/'].includes(value);
}

/** @param {import('@csstools/css-tokenizer').CSSToken[]} input @param {number} index @return {boolean} */
function operatorHasNoOperand(input, index) {
  let next = index + 1;
  while (input[next]?.[0] === TokenType.Whitespace) next++;
  return !input[next] || closingTokens.has(input[next][0]);
}

/** @param {import('@csstools/css-tokenizer').CSSToken[]} input @param {number} index @return {boolean} */
function commaHasNoOperand(input, index) {
  let previous = index - 1;
  let next = index + 1;
  while (input[previous]?.[0] === TokenType.Whitespace) previous--;
  while (input[next]?.[0] === TokenType.Whitespace) next++;
  return (
    previous < 0 ||
    next >= input.length ||
    input[previous][0] === TokenType.Comma ||
    input[next][0] === TokenType.Comma ||
    closingTokens.has(input[next][0])
  );
}

/** @param {string | null} name @param {number} argumentCount @return {boolean} */
function functionArityIsValid(name, argumentCount) {
  if (!name) return true;
  if (name === 'calc') return argumentCount === 1;
  if (name === 'clamp') return argumentCount === 3;
  if (name === 'min' || name === 'max' || name === 'hypot') {
    return argumentCount > 0;
  }
  if (name === 'round') return argumentCount === 1 || argumentCount === 2;
  if (name === 'mod' || name === 'rem' || name === 'atan2' || name === 'pow') {
    return argumentCount === 2;
  }
  if (
    [
      'abs',
      'sign',
      'sin',
      'cos',
      'tan',
      'asin',
      'acos',
      'atan',
      'sqrt',
      'log',
      'exp',
    ].includes(name)
  ) {
    return argumentCount === 1;
  }
  if (name === 'anchor-size') return argumentCount === 1 || argumentCount === 2;
  if (name === 'cubic-bezier') return argumentCount === 4;
  if (name === 'steps') return argumentCount === 1 || argumentCount === 2;
  if (name === 'linear') return argumentCount > 0;
  return false;
}

/** @param {Component} component @return {{number: number, unit: string} | false} */
function directNumeric(component) {
  if (component.tokens.length !== 1) return false;
  return numeric(component.tokens[0]);
}

/**
 * @param {Component} component
 * @param {{percentage: boolean, auto: boolean, nonNegative?: boolean}}
 *   grammar
 * @return {boolean}
 */
function isLengthComponent(component, grammar) {
  if (hasCssWideKeyword(component)) return false;
  if (component.tokens[0]?.[0] === TokenType.Function) {
    return hasAllowedFunctions(component, valueFunctions);
  }
  const value = directNumeric(component);
  if (value) {
    if (value.unit === '') {
      return value.number === 0;
    }
    if (value.unit === '%') {
      return grammar.percentage && (!grammar.nonNegative || value.number >= 0);
    }
    return (
      lengthUnits.has(value.unit.toLowerCase()) &&
      (!grammar.nonNegative || value.number >= 0)
    );
  }
  return (
    grammar.auto &&
    component.tokens.length === 1 &&
    component.tokens[0][0] === TokenType.Ident &&
    tokenName(component.tokens[0]) === 'auto'
  );
}

/** @param {Component[]} components @return {string | null} */
function reduceTwoAxis(components) {
  if (components.length < 1 || components.length > 2) return null;
  if (components.length === 1) return null;
  if (componentKey(components[0]) !== componentKey(components[1])) return null;
  return components[0].raw;
}

/**
 * @param {string} property
 * @param {Component[]} components
 * @return {string | null}
 */
function reduceTwoAxisProperty(property, components) {
  if (property === 'gap') {
    if (
      !components.every(
        (component) =>
          (component.tokens.length === 1 &&
            component.tokens[0][0] === TokenType.Ident &&
            gapKeywords.has(tokenName(component.tokens[0]))) ||
          isLengthComponent(component, {
            percentage: true,
            auto: false,
            nonNegative: true,
          })
      )
    )
      return null;
  } else if (property === 'overflow') {
    if (
      !components.every(
        (component) =>
          component.tokens.length === 1 &&
          component.tokens[0][0] === TokenType.Ident &&
          overflowKeywords.has(tokenName(component.tokens[0]))
      )
    )
      return null;
  } else if (property === 'overscroll-behavior') {
    if (
      !components.every(
        (component) =>
          component.tokens.length === 1 &&
          component.tokens[0][0] === TokenType.Ident &&
          overscrollKeywords.has(tokenName(component.tokens[0]))
      )
    )
      return null;
  } else {
    return null;
  }
  return reduceTwoAxis(components);
}

/** @param {string} property @param {Component[]} components @return {string | null} */
function reduceFourSide(property, components) {
  if (components.length < 1 || components.length > 4) return null;
  const grammar = fourSideGrammar(property);
  if (!components.every((component) => isLengthComponent(component, grammar))) {
    return null;
  }

  const values = propagateFourSide(components);
  const keys = values.map(componentKey);
  if (keys[0] === keys[1] && keys[0] === keys[2] && keys[0] === keys[3]) {
    return values[0].raw;
  }
  if (keys[0] === keys[2] && keys[1] === keys[3]) {
    return `${values[0].raw} ${values[1].raw}`;
  }
  if (keys[1] === keys[3]) {
    return `${values[0].raw} ${values[1].raw} ${values[2].raw}`;
  }
  return components.length === 4
    ? null
    : components.map(({ raw }) => raw).join(' ');
}

/** @param {string} property @return {{percentage: boolean, auto: boolean, nonNegative?: boolean}} */
function fourSideGrammar(property) {
  if (property === 'inset') return { percentage: true, auto: true };
  if (property === 'scroll-margin') return { percentage: false, auto: false };
  return { percentage: true, auto: true, nonNegative: true };
}

/** @param {Component[]} components @return {Component[]} */
function propagateFourSide(components) {
  if (components.length === 1) {
    return [components[0], components[0], components[0], components[0]];
  }
  if (components.length === 2) {
    return [components[0], components[1], components[0], components[1]];
  }
  if (components.length === 3) {
    return [components[0], components[1], components[2], components[1]];
  }
  return components;
}

/** @param {string} property @param {Component[]} components @return {string | null} */
function reduceAlignment(property, components) {
  const forms = alignmentForms.get(property);
  if (!forms || components.some((component) => !isSingleIdent(component))) {
    return null;
  }
  for (let split = 1; split < components.length; split++) {
    const first = components.slice(0, split);
    const second = components.slice(split);
    const firstName = first.map(componentName).join(' ');
    const secondName = second.map(componentName).join(' ');
    if (
      firstName === secondName &&
      forms.has(firstName) &&
      first.map(componentKey).join('|') === second.map(componentKey).join('|')
    ) {
      return first.map(({ raw }) => raw).join(' ');
    }
  }
  return null;
}

/** @param {Component} component @return {boolean} */
function isSingleIdent(component) {
  return (
    component.tokens.length === 1 &&
    component.tokens[0][0] === TokenType.Ident &&
    !cssGlobalKeywords.has(componentName(component))
  );
}

/** @param {string} value @return {string | null} */
function reduceAspectRatio(value) {
  const parsed = splitValue(value, false);
  if (!parsed) return null;
  const input = parsed.flatMap((part) =>
    part.components.flatMap((component) => component.tokens)
  );
  const significant = input.filter(
    (token) => token[0] !== TokenType.Whitespace
  );
  const offset =
    significant[0]?.[0] === TokenType.Ident &&
    tokenName(significant[0]) === 'auto'
      ? 1
      : 0;
  if (
    significant.length !== offset + 3 ||
    significant[offset]?.[0] !== TokenType.Number ||
    significant[offset + 1]?.[0] !== TokenType.Delim ||
    significant[offset + 1][1] !== '/' ||
    significant[offset + 2]?.[0] !== TokenType.Number
  )
    return null;
  const numerator = numeric(significant[offset]);
  const denominator = numeric(significant[offset + 2]);
  if (
    !numerator ||
    !denominator ||
    numerator.number <= 0 ||
    denominator.number !== 1 ||
    !Number.isFinite(numerator.number) ||
    !Number.isFinite(denominator.number)
  )
    return null;
  const rawNumerator = value.slice(
    tokenStart(significant[offset]),
    tokenEnd(significant[offset])
  );
  if (offset)
    return `${value.slice(tokenStart(significant[0]), tokenEnd(significant[0]))} ${rawNumerator}`;
  return rawNumerator;
}

/** @param {Component} component @return {{number: number, unit: string} | null} */
function transitionTime(component) {
  const value = directNumeric(component);
  return value &&
    transitionTimeUnits.has(value.unit.toLowerCase()) &&
    Number.isFinite(value.number)
    ? value
    : null;
}

/** @param {Component | null | undefined} component @return {boolean} */
function isZeroTransitionTime(component) {
  if (!component) return false;
  const value = transitionTime(component);
  return Boolean(value && value.number === 0);
}

/** @param {Component} component @return {boolean} */
function isTimingFunction(component) {
  const token = component.tokens[0];
  if (component.tokens.length === 1 && token[0] === TokenType.Ident) {
    return timingKeywords.has(tokenName(token));
  }
  return (
    token[0] === TokenType.Function &&
    timingFunctions.has(tokenName(token)) &&
    hasAllowedFunctions(component, timingFunctions)
  );
}

/** @param {Component} component @return {boolean} */
function isTransitionProperty(component) {
  if (hasCssWideKeyword(component) || component.tokens.length !== 1)
    return false;
  return component.tokens[0][0] === TokenType.Ident;
}

/** @typedef {{property: Component | null, duration: Component | null, timingFunction: Component | null, delay: Component | null}} TransitionSlots */

/** @param {{components: Component[], raw: string}} part @return {string | false | null} */
function reduceTransitionPart(part) {
  /** @type {TransitionSlots} */
  let slots = {
    property: null,
    duration: null,
    timingFunction: null,
    delay: null,
  };
  for (const component of part.components) {
    const consumed = consumeTransitionComponent(component, slots);
    if (!consumed) return null;
    slots = consumed;
  }
  if (!slots.property) return null;

  const removeDelay = isZeroTransitionTime(slots.delay);
  const removeTiming =
    slots.timingFunction !== null &&
    componentName(slots.timingFunction) === 'ease';
  const removeDuration =
    isZeroTransitionTime(slots.duration) && (!slots.delay || removeDelay);
  if (!removeDuration && !removeTiming && !removeDelay) return false;

  const removed = new Set([
    removeDuration ? slots.duration : null,
    removeTiming ? slots.timingFunction : null,
    removeDelay ? slots.delay : null,
  ]);
  return part.components
    .filter((component) => !removed.has(component))
    .map(({ raw }) => raw)
    .join(' ');
}

/**
 * @param {Component} component
 * @param {TransitionSlots} state
 * @return {TransitionSlots | null}
 */
function consumeTransitionComponent(component, state) {
  const time = transitionTime(component);
  if (time) {
    if (!state.duration) {
      if (time.number < 0) return null;
      return { ...state, duration: component };
    }
    if (state.delay) return null;
    return { ...state, delay: component };
  }
  if (isTimingFunction(component)) {
    if (state.timingFunction) return null;
    return { ...state, timingFunction: component };
  }
  if (isTransitionProperty(component) && !state.property) {
    return { ...state, property: component };
  }
  return null;
}

/** @param {string} value @return {string | null} */
function reduceTransition(value) {
  const parsed = splitValue(value, true);
  if (!parsed) return null;
  const reduced = parsed.map(reduceTransitionPart);
  if (reduced.some((part) => part === null)) return null;
  if (reduced.every((part) => part === false)) return null;
  return reduced.some((part) => part !== false)
    ? reduced.map((part, index) => part || parsed[index].raw).join(',')
    : null;
}

/** @param {string} property @param {string} value @return {string | null} */
function normalizeValue(property, value) {
  if (property === 'aspect-ratio') return reduceAspectRatio(value);
  if (property === 'transition' || property === '-webkit-transition') {
    return reduceTransition(value);
  }
  const parsed = splitValue(value, false);
  if (!parsed || parsed.length !== 1) return null;
  const components = parsed[0].components;
  if (
    property === 'gap' ||
    property === 'overflow' ||
    property === 'overscroll-behavior'
  ) {
    return reduceTwoAxisProperty(property, components);
  }
  if (
    property === 'inset' ||
    property === 'scroll-margin' ||
    property === 'scroll-padding'
  ) {
    return reduceFourSide(property, components);
  }
  if (
    property === 'place-items' ||
    property === 'place-self' ||
    property === 'place-content'
  ) {
    return reduceAlignment(property, components);
  }
  return null;
}

const properties = new Set([
  'aspect-ratio',
  'gap',
  'inset',
  'overflow',
  'overscroll-behavior',
  'place-content',
  'place-items',
  'place-self',
  'scroll-margin',
  'scroll-padding',
  'transition',
  '-webkit-transition',
]);

/** @param {import('postcss').Root} root @return {void} */
export default function minifyShorthandIdentities(root) {
  /** @type {Map<string, string | null>} */
  const cache = new Map();
  root.walkDecls((decl) => {
    const property = decl.prop.toLowerCase();
    if (!properties.has(property) || stylehacks.detect(decl)) return;
    const sourceValue =
      decl.raws.value?.value === decl.value
        ? (decl.raws.value.raw ?? decl.value)
        : decl.value;
    const key = `${property}\0${sourceValue}`;
    let result = cache.get(key);
    if (result === undefined && !cache.has(key)) {
      result = normalizeValue(property, sourceValue);
      cache.set(key, result);
    }
    if (result === undefined || result === null || result === decl.value)
      return;
    const oldValue = decl.value;
    decl.value = result;
    if (decl.raws.value?.value === oldValue) {
      decl.raws.value = { raw: result, value: result };
    }
  });
}
