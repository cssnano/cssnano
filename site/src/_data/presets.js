/**
 * @typedef {'default' | 'lite' | 'advanced'} PresetId
 * @typedef {'cssnano-preset-default' | 'cssnano-preset-lite' | 'cssnano-preset-advanced'} PresetName
 * @typedef {{ id: PresetId, packageName: PresetName, label: string, description: string }} Preset
 */

/** Presets in the order the site lists them. The playground and the optimisations table both follow it. */
const presets = /** @satisfies {Preset[]} */ ([
  {
    id: 'default',
    packageName: 'cssnano-preset-default',
    label: 'Preset Default',
    description:
      'applies safe optimisations that preserve the meaning of your CSS.',
  },
  {
    id: 'lite',
    packageName: 'cssnano-preset-lite',
    label: 'Preset Lite',
    description: 'only removes comments, whitespace and empty rules.',
  },
  {
    id: 'advanced',
    packageName: 'cssnano-preset-advanced',
    label: 'Preset Advanced',
    description:
      'adds optimisations that might change the way a website renders, unless the CSS follows common conventions.',
  },
]);

export default presets;
