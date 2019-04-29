import postcss from 'postcss';

export default function pluginName(plugin) {
  return postcss(plugin).plugins[0].postcssPlugin;
}
