/** @typedef {'default' | 'advanced' | 'lite'} Preset */

import advancedPreset from 'cssnano-preset-advanced';
import defaultPreset from 'cssnano-preset-default';
import litePreset from 'cssnano-preset-lite';
import pluginName from '../../util/pluginName.mjs';

/**
 * @typedef {object} Optimisation
 * @property {string} plugin Plugin identifier.
 * @property {string} shortName Display identifier.
 * @property {string} shortDescription Display name.
 * @property {string} longDescription
 * @property {string} inputExample
 * @property {string} outputExample
 * @property {string} [safe] Reason this optimisation may be unsafe.
 * @property {Preset[]} presets
 */

/** @typedef {Omit<Optimisation, 'presets'>} EditorialOptimisation */

const editorialOptimisations = /** @satisfies {EditorialOptimisation[]} */ ([
  {
    plugin: 'autoprefixer',
    shortName: 'autoprefixer',
    shortDescription: 'Removes outdated vendor prefixes',
    longDescription:
      'Removes unnecessary prefixes based on the `browsers` option. Note that *by default*, **it will not add new prefixes** to the CSS file.',
    inputExample:
      '.box {\n    -moz-border-radius: 10px;\n    border-radius: 10px;\n    display: flex;\n}\n',
    outputExample: '.box {\n    border-radius: 10px;\n    display: flex;\n}\n',
  },
  {
    plugin: 'css-declaration-sorter',
    shortName: 'cssDeclarationSorter',
    shortDescription: 'Sorts CSS declarations',
    longDescription:
      'Sorts CSS declarations based on their property names, sorted CSS is smaller when gzipped because there will be more similar strings.',
    inputExample:
      'body {\n    animation: none;\n    color: #C55;\n    border: 0;\n}\n',
    outputExample:
      'body {\n    animation: none;\n    border: 0;\n    color: #C55;\n}\n',
  },
  {
    plugin: 'postcss-calc',
    shortName: 'calc',
    shortDescription: 'Reduces CSS calc expressions',
    longDescription:
      'Reduces CSS `calc` expressions wherever possible, ensuring both browser compatibility and compression.',
    inputExample: '.box {\n    width: calc(2 * 100px);\n}\n',
    outputExample: '.box {\n    width: 200px;\n}\n',
  },
  {
    plugin: 'postcss-colormin',
    shortName: 'colormin',
    shortDescription: 'Minify colors in your CSS files with PostCSS.',
    longDescription:
      'Converts between hex, hsl, rgb and CSS keywords, in order to produce the\nsmallest equivalent color value.\n',
    inputExample: '.box {\n    background: hsl(134, 50%, 50%);\n}\n',
    outputExample: '.box {\n    background: #40bf5e;\n}\n',
  },
  {
    plugin: 'postcss-convert-values',
    shortName: 'convertValues',
    shortDescription: 'Convert values with PostCSS (e.g. ms -> s)',
    longDescription:
      'Converts between equivalent length, time & angle values. Note that *by default*,\nlength values are not converted.\n',
    inputExample: '.box {\n    transition: color 500ms ease;\n}\n',
    outputExample: '.box {\n    transition: color .5s ease;\n}\n',
  },
  {
    plugin: 'postcss-discard-comments',
    shortName: 'discardComments',
    shortDescription: 'Discard comments in your CSS files with PostCSS.',
    longDescription:
      'Removes comments in and around rules, selectors & declarations. Note that any\nspecial comments marked with `!` are kept by default.\n',
    inputExample:
      '/*! license */\n.box {\n    /* Red headings */\n    color: red;\n}\n',
    outputExample: '/*! license */\n.box {\n    color: red;\n}\n',
  },
  {
    plugin: 'postcss-discard-duplicates',
    shortName: 'discardDuplicates',
    shortDescription: 'Discard duplicate rules in your CSS files with PostCSS.',
    longDescription:
      'Removes duplicated rules, at-rules and declarations. Note that this only works\nfor *exact* duplicates.\n',
    inputExample:
      '.box {\n    border: 1px solid silver;\n}\n\n.box {\n    border: 1px solid silver;\n}\n',
    outputExample: '.box {\n    border: 1px solid silver;\n}\n',
  },
  {
    plugin: 'postcss-discard-empty',
    shortName: 'discardEmpty',
    shortDescription: 'Discard empty rules and values with PostCSS.',
    longDescription:
      'Removes empty rules, media queries & rules with empty selectors, as they\ndo not affect the output.\n',
    inputExample: '.box {}\n@media screen {}\n{color: green;}\n',
    outputExample: '/* (removed) */',
  },
  {
    plugin: 'postcss-discard-overridden',
    shortName: 'discardOverridden',
    shortDescription:
      'PostCSS plugin to discard overridden @keyframes or @counter-style.',
    longDescription:
      'Removes at-rules which have the same identifier as another; for example two\ninstances of `@keyframes one`. As the browser will only count the *last* of\nthese declarations, all others can safely be removed.\n',
    inputExample:
      '@keyframes one {\n    0% {\n        opacity: 1;\n    }\n    to {\n        opacity: 0;\n    }\n}\n@keyframes one {\n    0% {\n        transform: rotate(0deg);\n    }\n    to {\n        transform: rotate(359deg);\n    }\n}\n.box {\n    animation-name: one;\n}\n',
    outputExample:
      '@keyframes one {\n    0% {\n        transform: rotate(0deg);\n    }\n    to {\n        transform: rotate(359deg);\n    }\n}\n.box {\n    animation-name: one;\n}\n',
  },
  {
    plugin: 'postcss-discard-unused',
    shortName: 'discardUnused',
    shortDescription: 'Discard unused counter styles, keyframes and fonts.',
    safe: 'Assumes concatenation & changes semantics',
    longDescription:
      'Removes at-rules that do not have any bearing on the CSS file. This is unsafe\nif you have other stylesheets which pair up to these rules.\n',
    inputExample:
      '@keyframes fadeOut {\n    from {\n        opacity: 1;\n    }\n    to {\n        opacity: 0;\n    }\n}\n',
    outputExample: '/* (removed) */',
  },
  {
    plugin: 'postcss-merge-idents',
    shortName: 'mergeIdents',
    shortDescription: 'Merge keyframe and counter style identifiers.',
    safe: 'Assumes concatenation & changes semantics',
    longDescription:
      'This will merge rules together that may have slightly different naming but do\nthe same thing. Note that this is only unsafe if you rely on those animation\nnames in JavaScript.\n',
    inputExample:
      '@keyframes fadeOut {\n    from {\n        opacity: 1;\n    }\n    to {\n        opacity: 0;\n    }\n}\n@keyframes dissolve {\n    from {\n        opacity: 1;\n    }\n    to {\n        opacity: 0;\n    }\n}\n.box {\n    animation-name: dissolve;\n}\n',
    outputExample:
      '@keyframes fadeOut {\n    from {\n        opacity: 1;\n    }\n    to {\n        opacity: 0;\n    }\n}\n.box {\n    animation-name: fadeOut;\n}\n',
  },
  {
    plugin: 'postcss-merge-longhand',
    shortName: 'mergeLonghand',
    shortDescription: 'Merge longhand properties into shorthand with PostCSS.',
    longDescription:
      'Collapses longhand properties into the shorthand representation, and where\npossible will also collapse top/right/bottom/left values. Supports `margin`,\n`padding` & `border` longhands.\n',
    inputExample:
      '.box {\n    margin-top: 10px;\n    margin-right: 20px;\n    margin-bottom: 10px;\n    margin-left: 20px;\n}\n',
    outputExample: '.box {\n    margin: 10px 20px;\n}\n',
  },
  {
    plugin: 'postcss-merge-rules',
    shortName: 'mergeRules',
    shortDescription: 'Merge CSS rules with PostCSS.',
    longDescription:
      'Merges adjacent rules by selectors & overlapping property/value pairs.\n',
    inputExample:
      '.box {\n    color: blue;\n}\n.box {\n    font-weight: 700;\n}\n',
    outputExample: '.box {\n    color: blue;\n    font-weight: 700;\n}\n',
  },
  {
    plugin: 'postcss-minify-font-values',
    shortName: 'minifyFontValues',
    shortDescription: 'Minify font declarations with PostCSS',
    longDescription:
      'Normalizes font & font-family declarations, and can convert font weight\nkeywords to numeric values.\n',
    inputExample:
      '.box {\n    font-family: "Helvetica Neue", Arial, Arial, sans-serif;\n    font-weight: normal;\n}\n',
    outputExample:
      '.box {\n    font-family: Helvetica Neue, Arial, sans-serif;\n    font-weight: 400;\n}\n',
  },
  {
    plugin: 'postcss-minify-gradients',
    shortName: 'minifyGradients',
    shortDescription: 'Minify gradient parameters with PostCSS.',
    longDescription: 'Normalizes linear and radial gradient parameters.',
    inputExample:
      '.box {\n    background: linear-gradient(to bottom, #ffe500 0%, #ffe500 50%, #121 50%, #121 100%);\n}\n',
    outputExample:
      '.box {\n    background: linear-gradient(180deg, #ffe500, #ffe500 50%, #121 0, #121);\n}\n',
  },
  {
    plugin: 'postcss-minify-params',
    shortName: 'minifyParams',
    shortDescription: 'Minify at-rule params with PostCSS',
    longDescription: 'Trims whitespace and normalizes at-rule parameters.',
    inputExample:
      '@media only screen   and ( min-width: 400px, min-height: 500px ) {\n    .box {\n        color: blue;\n    }\n}\n',
    outputExample:
      '@media only screen and (min-width:400px,min-height:500px) {\n    .box {\n        color: blue;\n    }\n}\n',
  },
  {
    plugin: 'postcss-minify-selectors',
    shortName: 'minifySelectors',
    shortDescription: 'Minify selectors with PostCSS.',
    longDescription:
      'Removes unnecessary qualified universal selectors, unquotes attribute selectors,\ntrims & normalizes selector strings.\n',
    inputExample:
      '*.box\n.box::before\n.box       .box\n[class*="box"]\n.box ~ [class] {\n    color: red;\n}\n',
    outputExample:
      '.box\n.box:before\n.box .box\n[class*=box]\n.box~[class] {\n    color: red;\n}\n',
  },
  {
    plugin: 'postcss-normalize-charset',
    shortName: 'normalizeCharset',
    shortDescription: 'Add necessary or remove extra charset with PostCSS',
    longDescription:
      'Ensures that only a single `@charset` is present in the CSS file, and moves it\nto the top of the document. This prevents multiple, invalid declarations\noccurring through naïve CSS concatenation. Note that *by default*, new\n`@charset` rules will not be added to the CSS.\n',
    inputExample:
      '.box {\n    content: "©";\n}\n@charset "utf-8";\n@charset "utf-8";\n',
    outputExample: '@charset "utf-8";\n.box {\n    content: "©";\n}\n',
  },
  {
    plugin: 'postcss-normalize-display-values',
    shortName: 'normalizeDisplayValues',
    shortDescription:
      'Normalize multiple value display syntaxes into single values.',
    longDescription:
      'Normalizes the two value syntax for `display` into the single value syntax\nwhere possible.\n',
    inputExample: '.box {\n    display: block flow;\n}\n',
    outputExample: '.box {\n    display: block;\n}\n',
  },
  {
    plugin: 'postcss-normalize-positions',
    shortName: 'normalizePositions',
    shortDescription:
      'Normalize keyword values for position into length values.',
    longDescription:
      'Normalizes `position` values in the `background`, `background-position`,\n`-webkit-perspective-origin` and `perspective-origin` properties.\n',
    inputExample: '.box {\n    background: 30% center / 50% 50%;\n}\n',
    outputExample: '.box {\n    background: 30% / 50% 50%;\n}\n',
  },
  {
    plugin: 'postcss-normalize-repeat-style',
    shortName: 'normalizeRepeatStyle',
    shortDescription:
      'Convert two value syntax for repeat-style into one value.',
    longDescription:
      'Reduces the two value syntax for `background-repeat` into the single value\nsyntax where possible, in both the property itself and the `background`\nshorthand. Also works for `mask-repeat`.\n',
    inputExample: '.box {\n    background-repeat: no-repeat repeat;\n}\n',
    outputExample: '.box {\n    background-repeat: repeat-y;\n}\n',
  },
  {
    plugin: 'postcss-normalize-string',
    shortName: 'normalizeString',
    shortDescription: 'Normalize wrapping quotes for CSS string literals.',
    longDescription:
      "Standardises the usage of double (by default) or single quoted strings, for\nbetter gzip compression. Can also remove linebreaks which are inserted for\naesthetic purposes. If you prefer single quotes, you can set\n`preferredQuote: 'single'` instead.\n",
    inputExample:
      ".box {\n    quotes: '«' \"»\";\n    content: 'This is a string which is \\\nbroken over multiple lines.';\n}\n",
    outputExample:
      '.box {\n    quotes: "«" "»";\n    content: "This is a string which is broken over multiple lines.";\n}\n',
  },
  {
    plugin: 'postcss-normalize-timing-functions',
    shortName: 'normalizeTimingFunctions',
    shortDescription: 'Normalize CSS animation/transition timing functions.',
    longDescription:
      'Normalizes transition timing in the `animation`, `animation-timing-function`,\n`transition` and `transition-timing-function` properties.\n',
    inputExample: '.box {\n    transition: color 3s steps(30, end);\n}\n',
    outputExample: '.box {\n    transition: color 3s steps(30);\n}\n',
  },
  {
    plugin: 'postcss-normalize-unicode',
    shortName: 'normalizeUnicode',
    shortDescription:
      'Normalize unicode-range descriptors, and can convert to wildcard ranges.',
    longDescription:
      'This optimisation can convert `unicode-range` descriptors to use the shorter\nwildcard ranges when a particular value meets the wildcard criteria. Values will\nbe converted when the code matches `0` & `f` in the same place on both sides\nof the range. So, `u+2000-2fff` can be converted to `u+2???`, but `u+2100-2fff`\nwill be left as it is.\n',
    inputExample:
      '@font-face {\n    font-family: "Latin Extended Additional";\n    unicode-range: u+1e00-1eff;\n    src: local("Baskerville");\n}\n\nbody {\n    font-family: "Latin Extended Additional", sans-serif;\n}\n',
    outputExample:
      '@font-face {\n    font-family: "Latin Extended Additional";\n    unicode-range: u+1e??;\n    src: local("Baskerville");\n}\n\nbody {\n    font-family: "Latin Extended Additional", sans-serif;\n}\n',
  },
  {
    plugin: 'postcss-normalize-url',
    shortName: 'normalizeUrl',
    shortDescription: 'Normalize URLs with PostCSS',
    longDescription:
      'Normalizes URL strings. It can remove default ports, resolve unnecessary\ndirectory traversal & unquote the value.\n',
    inputExample: '.box {\n    background: url("./css/../img/cat.jpg");\n}\n',
    outputExample: '.box {\n    background: url(img/cat.jpg);\n}\n',
  },
  {
    plugin: 'postcss-normalize-whitespace',
    shortName: 'normalizeWhitespace',
    shortDescription:
      'Trim whitespace inside and around CSS rules & declarations.',
    longDescription:
      'Trims whitespace inside and around rules, selectors & declarations,\nplus removes the final semicolon inside every selector.\n',
    inputExample:
      '.box {\n    text-decoration: underline;\n    color: red !important;\n}\n',
    outputExample: '.box{text-decoration:underline;color:red!important}\n',
  },
  {
    plugin: 'postcss-ordered-values',
    shortName: 'orderedValues',
    shortDescription: 'Ensure values are ordered consistently in your CSS.',
    longDescription:
      'Properties affected by this transform can accept their arguments in an\narbitrary order. This module normalizes that order, facilitating\neasier de-duplication.\n',
    inputExample:
      '.box {\n    border: solid 1px red;\n    border: #fff solid 1px;\n}\n',
    outputExample:
      '.box {\n    border: 1px solid red;\n    border: 1px solid #fff;\n}\n',
  },
  {
    plugin: 'postcss-reduce-idents',
    shortName: 'reduceIdents',
    shortDescription: 'Reduce custom identifiers with PostCSS.',
    safe: 'Changes semantics',
    longDescription:
      'Renames at-rules such as `@keyframes`. This can be potentially unsafe if other\nJS/CSS files need to read this definition.\n',
    inputExample:
      '@keyframes fadeOut {\n    from {\n        opacity: 1;\n    }\n    to {\n        opacity: 0;\n    }\n}\n.box {\n    animation-name: fadeOut;\n}\n',
    outputExample:
      '@keyframes a {\n    from {\n        opacity: 1;\n    }\n    to {\n        opacity: 0;\n    }\n}\n.box {\n    animation-name: a;\n}\n',
  },
  {
    plugin: 'postcss-reduce-initial',
    shortName: 'reduceInitial',
    shortDescription:
      'Reduce initial definitions to the actual initial value, where possible.',
    longDescription:
      'Replaces the CSS `initial` keyword with the *actual* value, when the\nresulting output is smaller\n',
    inputExample: '.box {\n    min-width: initial;\n}\n',
    outputExample: '.box {\n    min-width: 0;\n}\n',
  },
  {
    plugin: 'postcss-reduce-transforms',
    shortName: 'reduceTransforms',
    shortDescription: 'Reduce transform functions with PostCSS.',
    longDescription:
      'Converts between transform functions when there is a shorthand equivalent.\n',
    inputExample: '.box {\n    transform: translate3d(0, 0, 0);\n}\n',
    outputExample: '.box {\n    transform: translateZ(0);\n}\n',
  },
  {
    plugin: 'postcss-svgo',
    shortName: 'svgo',
    shortDescription: 'Optimise inline SVG with PostCSS.',
    longDescription:
      'Compresses inline SVG definitions with [SVGO](https://github.com/svg/svgo).\n',
    inputExample:
      ".box {\n    background:url('data:image/svg+xml;utf-8,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22utf-8%22%3F%3E%3C!DOCTYPE%20svg%20PUBLIC%20%22-%2F%2FW3C%2F%2FDTD%20SVG%201.1%2F%2FEN%22%20%22http%3A%2F%2Fwww.w3.org%2FGraphics%2FSVG%2F1.1%2FDTD%2Fsvg11.dtd%22%3E%3Csvg%20version%3D%221.1%22%20id%3D%22Layer_1%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20xml%3Aspace%3D%22preserve%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2240%22%20fill%3D%22yellow%22%20%2F%3E%3C!--test%20comment--%3E%3C%2Fsvg%3E');\n}\n",
    outputExample:
      ".box {\n    background:url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='40' fill='%23ff0'/%3E%3C/svg%3E\");\n}\n",
  },
  {
    plugin: 'postcss-unique-selectors',
    shortName: 'uniqueSelectors',
    shortDescription: 'Ensure CSS selectors are unique.',
    longDescription:
      'Naturally sorts selectors for every rule, and removes duplicates.\n',
    inputExample: '.box, .boxB, .boxA, .box {\n    color: red;\n}\n',
    outputExample: '.box, .boxA, .boxB {\n    color: red;\n}\n',
  },
  {
    plugin: 'postcss-zindex',
    shortName: 'zindex',
    shortDescription: 'Reduce z-index values with PostCSS.',
    safe: 'Assumes concatenation & changes semantics',
    longDescription:
      'Rebases z-index values. This is unsafe as it could potentially clash with other\nstylesheets, or JavaScript injected styles. However, it is safe if your stacking\ncontext has wholly been extracted into CSS.\n',
    inputExample: '.box {\n    z-index: 5000;\n}\n',
    outputExample: '.box {\n    z-index: 1;\n}\n',
  },
]);

function matchPluginsWithPresets() {
  const presetModules = {
    default: defaultPreset,
    advanced: advancedPreset,
    lite: litePreset,
  };
  const internalPlugins = new Set(['cssnano-util-raw-cache']);
  const presetPlugins = Object.fromEntries(
    Object.entries(presetModules).map(([preset, presetModule]) => [
      preset,
      new Set(
        presetModule()
          .plugins.filter(
            ([, options]) =>
              options != null &&
              options !== false &&
              !('exclude' in options && options.exclude)
          )
          .map(([plugin]) => pluginName(plugin))
      ),
    ])
  );
  const documentedPlugins = new Set(
    editorialOptimisations.map((optimisation) => optimisation.plugin)
  );
  const undocumentedPlugins = [
    ...new Set(Object.values(presetPlugins).flatMap((plugins) => [...plugins])),
  ].filter(
    (plugin) => !internalPlugins.has(plugin) && !documentedPlugins.has(plugin)
  );

  if (undocumentedPlugins.length > 0) {
    throw new Error(
      `Missing optimisation documentation for: ${undocumentedPlugins.toSorted().join(', ')}`
    );
  }

  const optimisations = editorialOptimisations.map((optimisation) => ({
    ...optimisation,
    presets: Object.entries(presetPlugins)
      .filter(([, plugins]) => plugins.has(optimisation.plugin))
      .map(([preset]) => preset),
  }));

  return optimisations;
}

const optimisations = matchPluginsWithPresets();

export default optimisations;
