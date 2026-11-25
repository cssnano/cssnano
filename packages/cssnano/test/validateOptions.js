import advancedPreset from '#presets/advanced';
import defaultPreset from '#presets/default';
import litePreset from '#presets/lite';
import { presetEntriesKey } from '../src/presets/presetEntries.js';
import { validateOptions } from '../src/options.js';

const presets = {
  default: defaultPreset,
  lite: litePreset,
  advanced: advancedPreset,
};

/**
 * @param {Record<string, unknown>} input
 * @param {Parameters<typeof validateOptions>[1]} [place]
 * @param {keyof typeof presets} [preset] the preset that runs the options
 */
export const validate = (input, place = 'inline', preset = 'default') =>
  validateOptions(input, place, presets[preset][presetEntriesKey]);
