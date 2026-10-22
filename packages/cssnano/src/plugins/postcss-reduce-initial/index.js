import { stageDescriptor } from '../../pipeline/host.js';
import { supportsAll } from '#utils/browser-support';
import fromInitial from './data/fromInitial.json' with { type: 'json' };
import toInitial from './data/toInitial.json' with { type: 'json' };
import ignoreProps from './lib/ignoreProps.js';

const initial = 'initial';

// In most of the browser including chrome the initial for `writing-mode` is not `horizontal-tb`. Ref https://github.com/cssnano/cssnano/pull/905
const defaultIgnoreProps = ignoreProps;

/**
 * @typedef {object} Options
 * @property {string[]} [ignore] Properties that keep their value, such as `min-height`. (default: none)
 */

/**
 * One reducer per pair of replacements, so properties that are treated alike
 * share it and their plan.
 * @typedef {Map<string | null, Map<string | null, import('../../pipeline/host.js').Reducer>>} Reducers
 */

/**
 * @param {Reducers} reducers
 * @param {string | null} toKeyword the initial value of the property, which becomes `initial`
 * @param {string | null} fromKeyword what `initial` becomes
 * @return {import('../../pipeline/host.js').Reducer}
 */
function reducerFor(reducers, toKeyword, fromKeyword) {
  let byFrom = reducers.get(toKeyword);
  if (byFrom === undefined) {
    byFrom = new Map();
    reducers.set(toKeyword, byFrom);
  }
  let reducer = byFrom.get(fromKeyword);
  if (reducer === undefined) {
    reducer = (buffer) => {
      const lower = buffer.text().toLowerCase();
      if (toKeyword !== null && lower === toKeyword) {
        buffer.replaceText(initial);
      } else if (fromKeyword !== null && lower === initial) {
        buffer.replaceText(fromKeyword);
      }
    };
    byFrom.set(fromKeyword, reducer);
  }
  return reducer;
}

/**
 * Compiles the properties to leave alone. The stage does nothing when a
 * browser target lacks the `initial` keyword.
 *
 * @param {Options} options
 * @param {readonly string[] | undefined} browsers
 * @return {(() => import('../../pipeline/host.js').ValueStage) | null}
 */
function compileReduceInitial(options, browsers) {
  if (
    !supportsAll(
      /** @type {readonly string[]} */ (browsers),
      'css-initial-value'
    )
  ) {
    return null;
  }
  const ignoreProp = new Set(defaultIgnoreProps.concat(options.ignore || []));
  return () => {
    /** @type {Reducers} */
    const reducers = new Map();
    return {
      forProperty(property) {
        const lowerCasedProp = property.toLowerCase();
        if (ignoreProp.has(lowerCasedProp)) return null;
        const toKeyword = Object.hasOwn(toInitial, lowerCasedProp)
          ? toInitial[/** @type keyof typeof toInitial */ (lowerCasedProp)]
          : null;
        const fromKeyword =
          fromInitial[/** @type keyof typeof fromInitial */ (lowerCasedProp)] ||
          null;
        if (toKeyword === null && fromKeyword === null) return null;
        return reducerFor(reducers, toKeyword, fromKeyword);
      },
    };
  };
}

/** @type {import('../../pipeline/host.js').StageDescriptor} */
const reduceInitial = stageDescriptor({
  targets: true,
  compile: compileReduceInitial,
});

export { reduceInitial as default };
