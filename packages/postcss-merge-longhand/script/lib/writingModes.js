/**
 * Derives which physical side each flow-relative box longhand sets, for every
 * combination of `writing-mode` and `direction`. Both are inherited and any
 * other rule may set them, so a minifier has to hold for all of them.
 *
 * CSS Writing Modes 4, "Abstract-to-Physical Mappings", gives each writing
 * mode the physical direction its lines stack in (block flow) and the
 * direction text runs in when `direction` is `ltr` (inline flow). The sides
 * follow from those: a flow starts on the side opposite to where it points.
 * `direction: rtl` reverses the inline flow only.
 */
import { serializeJson } from '../../../../util/webref/webref.js';

/** @type {Record<string, string>} */
const opposite = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

/**
 * The side each flow runs towards: lines stack along the block flow, and text
 * runs along the inline flow when `direction` is `ltr`.
 *
 * @type {[string, { block: string, inline: string }][]}
 */
const flows = [
  ['horizontal-tb', { block: 'bottom', inline: 'right' }],
  ['vertical-rl', { block: 'left', inline: 'bottom' }],
  ['vertical-lr', { block: 'right', inline: 'bottom' }],
  ['sideways-rl', { block: 'left', inline: 'bottom' }],
  ['sideways-lr', { block: 'right', inline: 'top' }],
];

/**
 * @typedef {object} Mode
 * @property {string} writingMode
 * @property {'ltr' | 'rtl'} direction
 * @property {Record<string, string>} sides The physical side of each
 * flow-relative suffix, such as `block-start`.
 *
 * @typedef {object} FlowRelativeSides
 * @property {Mode[]} modes
 * @property {Record<string, string[]>} possibleSides The sides some mode maps
 * a flow-relative suffix to, sorted.
 */

/** @return {FlowRelativeSides} */
export function buildFlowRelativeSides() {
  /** @type {Mode[]} */
  const modes = [];

  for (const [writingMode, flow] of flows) {
    for (const direction of /** @type {const} */ (['ltr', 'rtl'])) {
      const inlineFlow =
        direction === 'ltr' ? flow.inline : opposite[flow.inline];

      modes.push({
        writingMode,
        direction,
        sides: {
          'block-start': opposite[flow.block],
          'block-end': flow.block,
          'inline-start': opposite[inlineFlow],
          'inline-end': inlineFlow,
        },
      });
    }
  }

  /** @type {Record<string, string[]>} */
  const possibleSides = {};

  for (const suffix of Object.keys(modes[0].sides)) {
    possibleSides[suffix] = [
      ...new Set(modes.map((mode) => mode.sides[suffix])),
    ].toSorted();
  }

  return { modes, possibleSides };
}

/**
 * The plugin reads the modes only; `possibleSides` is a summary the tests use.
 *
 * @param {FlowRelativeSides} data
 * @return {string}
 */
export function serializeFlowRelativeSides({ modes }) {
  return serializeJson({ modes });
}
