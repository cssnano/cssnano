/**
 * @typedef {'default' | 'lite' | 'advanced'} PresetId
 * @typedef {{ id: PresetId, label: string, description: string }} Preset
 */

/** Presets in the order the site lists them. The playground and the optimisations table both follow it. */
const presets = /** @satisfies {Preset[]} */ ([
  {
    id: 'default',
    label: 'Preset Default',
    description:
      'applies safe optimisations that preserve the meaning of your CSS.',
  },
  {
    id: 'lite',
    label: 'Preset Lite',
    description: 'only removes comments, whitespace and empty rules.',
  },
  {
    id: 'advanced',
    label: 'Preset Advanced',
    description:
      'adds optimisations that might change the way a website renders, unless the CSS follows common conventions.',
  },
]);

export default presets;
