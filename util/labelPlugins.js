/** @typedef {Record<string, unknown>} Plugin */

/**
 * Labels each plugin by its PostCSS name, and numbers repeats, so two entries
 * with the same name stay apart.
 *
 * @param {Plugin[]} plugins
 * @return {{ label: string, plugin: Plugin }[]}
 */
export function labelPlugins(plugins) {
  /** @type {Map<string, number>} */
  const seen = new Map();
  return plugins.map((plugin) => {
    const name = String(plugin.postcssPlugin);
    const occurrence = (seen.get(name) ?? 0) + 1;
    seen.set(name, occurrence);
    return {
      label: occurrence === 1 ? name : `${name}#${occurrence}`,
      plugin,
    };
  });
}
