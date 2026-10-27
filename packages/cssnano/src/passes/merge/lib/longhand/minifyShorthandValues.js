import { expandFourSides, fourSideCount } from './parseTrbl.js';
import { cssWideKeywords } from './spec.js';
import cssnanoUtils from '#utils';
import shorthandData from './data/shorthandIdentities.json' with { type: 'json' };
import { shorthandForms } from './decl/alignmentForms.js';
import { splitValue } from './valueComponents.js';
import {
  componentKey,
  componentName,
  directNumeric,
  hasAllowedFunctions,
  hasCssWideKeyword,
  isLengthComponent,
  tokenName,
} from './shorthandValueGrammar.js';
import {
  joinSpelled,
  spellComponent,
  spellPart,
  spelledList,
} from './spelledText.js';
import { reduceAspectRatio } from './aspectRatioValue.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */
/** @import {Component} from './valueComponents.js' */
/** @import {FoldedSelector} from '../../../../values/textTable.js' */
/** @import {Spelled} from './spelledText.js' */

const { TokenType, asciiLowerCase } = cssnanoUtils;

const overflowKeywords = new Set([
  'visible',
  'hidden',
  'clip',
  'scroll',
  'auto',
]);
const overscrollKeywords = new Set(['auto', 'contain', 'none']);
const axisKeywords = new Map([
  ['overflow', overflowKeywords],
  ['overscroll-behavior', overscrollKeywords],
]);
const gapKeywords = new Set(['normal']);
const timingKeywords = new Set(shorthandData.easing.keywords);
const timingFunctions = new Set(shorthandData.easing.functions);
const transitionTimeUnits = new Set(['ms', 's']);

/**
 * @param {readonly CSSToken[]} list the tokens of the value
 * @param {Component[]} components
 * @return {Spelled | null}
 */
function reduceTwoAxis(list, components) {
  if (components.length !== 2) return null;
  if (componentKey(components[0]) !== componentKey(components[1])) return null;
  return spellComponent(list, components[0]);
}

/**
 * @param {readonly CSSToken[]} list the tokens of the value
 * @param {string} property
 * @param {Component[]} components
 * @return {Spelled | null}
 */
function reduceTwoAxisProperty(list, property, components) {
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
  } else if (axisKeywords.has(property)) {
    const keywords = /** @type {Set<string>} */ (axisKeywords.get(property));
    if (
      !components.every(
        (component) =>
          component.tokens.length === 1 &&
          component.tokens[0][0] === TokenType.Ident &&
          keywords.has(tokenName(component.tokens[0]))
      )
    )
      return null;
  } else if (property === 'border-spacing') {
    if (
      !components.every((component) =>
        isLengthComponent(component, {
          percentage: false,
          auto: false,
          nonNegative: true,
        })
      )
    )
      return null;
  } else {
    return null;
  }
  return reduceTwoAxis(list, components);
}

/**
 * @param {readonly CSSToken[]} list the tokens of the value
 * @param {string} property
 * @param {Component[]} components
 * @return {Spelled | null}
 */
function reduceFourSide(list, property, components) {
  if (components.length < 1 || components.length > 4) return null;
  const grammar = fourSideGrammar(property);
  if (!components.every((component) => isLengthComponent(component, grammar))) {
    return null;
  }

  const values = expandFourSides(components);
  const count = fourSideCount(values.map(componentKey));
  return count === 4
    ? null
    : joinSpelled(
        values
          .slice(0, count)
          .map((component) => spellComponent(list, component)),
        ' '
      );
}

/** @param {string} property @return {{percentage: boolean, auto: boolean, nonNegative?: boolean}} */
function fourSideGrammar(property) {
  if (property === 'inset') return { percentage: true, auto: true };
  if (property === 'scroll-margin') return { percentage: false, auto: false };
  return { percentage: true, auto: true, nonNegative: true };
}

/**
 * @param {readonly CSSToken[]} list the tokens of the value
 * @param {string} property
 * @param {Component[]} components
 * @return {Spelled | null}
 */
function reduceAlignment(list, property, components) {
  const forms = shorthandForms.get(property);
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
      return joinSpelled(
        first.map((component) => spellComponent(list, component)),
        ' '
      );
    }
  }
  return null;
}

/** @param {Component} component @return {boolean} */
function isSingleIdent(component) {
  return (
    component.tokens.length === 1 &&
    component.tokens[0][0] === TokenType.Ident &&
    !cssWideKeywords.has(componentName(component))
  );
}

/** @param {Component} component @return {{number: number, unit: string} | null} */
function transitionTime(component) {
  const value = directNumeric(component);
  return value &&
    transitionTimeUnits.has(asciiLowerCase(value.unit)) &&
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

/**
 * @param {readonly CSSToken[]} list the tokens of the value
 * @param {{components: Component[], raw: string}} part
 * @return {Spelled | false | null}
 */
function reduceTransitionPart(list, part) {
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
  return joinSpelled(
    part.components
      .filter((component) => !removed.has(component))
      .map((component) => spellComponent(list, component)),
    ' '
  );
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

/**
 * @param {string} value
 * @param {readonly CSSToken[]} list the tokens of `value`
 * @return {Spelled | null}
 */
function reduceTransition(value, list) {
  const parsed = splitValue(value, ',', list);
  if (!parsed) return null;
  const reduced = parsed.map((part) => reduceTransitionPart(list, part));
  if (reduced.some((part) => part === null)) return null;
  if (reduced.every((part) => part === false)) return null;
  return joinSpelled(
    reduced.map((part, index) => part || spellPart(list, parsed[index])),
    ','
  );
}

/**
 * Reduces a shorthand value to the text it folds to, with the ranges of its
 * tokens that spell it.
 *
 * @param {string} property
 * @param {string} value
 * @param {readonly CSSToken[]} list the tokens of `value`
 * @return {Spelled | null}
 */
function reduceValue(property, value, list) {
  if (property === 'aspect-ratio') return reduceAspectRatio(value, list);
  if (property === 'transition' || property === '-webkit-transition') {
    return reduceTransition(value, list);
  }
  const parsed = splitValue(value, undefined, list);
  if (!parsed || parsed.length !== 1) return null;
  const components = parsed[0].components;
  if (
    property === 'border-spacing' ||
    property === 'gap' ||
    property === 'overflow' ||
    property === 'overscroll-behavior'
  ) {
    return reduceTwoAxisProperty(list, property, components);
  }
  if (
    property === 'inset' ||
    property === 'scroll-margin' ||
    property === 'scroll-padding'
  ) {
    return reduceFourSide(list, property, components);
  }
  if (
    property === 'place-items' ||
    property === 'place-self' ||
    property === 'place-content'
  ) {
    return reduceAlignment(list, property, components);
  }
  return null;
}

/**
 * The shorthand value a declaration folds to, with the token list that spells
 * it. The list is built from `list`'s ranges and is undefined when those do
 * not spell the text, as with a part's trimmed raw; a value that does not
 * change gives null.
 *
 * @param {string} property
 * @param {string} value
 * @param {readonly CSSToken[]} list the tokens of `value`
 * @return {FoldedSelector | null}
 */
export function normalizeValue(property, value, list) {
  const spelled = reduceValue(property, value, list);
  if (spelled === null || spelled.text === value) return null;
  return spelledList(spelled);
}
