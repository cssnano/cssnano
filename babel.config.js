const path = require('path');

module.exports = function (api) {
  const env = api.env();

  const plugins = [];

  if (env === 'publish') {
    plugins.push('add-module-exports');
    plugins.push([
      'module-resolver',
      {
        alias: {
          'lerna:css-size': 'css-size',
          'lerna:cssnano': 'cssnano',
          'lerna:cssnano-preset-advanced': 'cssnano-preset-advanced',
          'lerna:cssnano-preset-default': 'cssnano-preset-default',
          'lerna:cssnano-util-get-arguments': 'cssnano-util-get-arguments',
          'lerna:cssnano-util-get-match': 'cssnano-util-get-match',
          'lerna:cssnano-util-same-parent': 'cssnano-util-same-parent',
          'lerna:cssnano-utils': 'cssnano-utils',
          'lerna:postcss-colormin': 'postcss-colormin',
          'lerna:postcss-convert-values': 'postcss-convert-values',
          'lerna:postcss-discard-comments': 'postcss-discard-comments',
          'lerna:postcss-discard-duplicates': 'postcss-discard-duplicates',
          'lerna:postcss-discard-empty': 'postcss-discard-empty',
          'lerna:postcss-discard-overridden': 'postcss-discard-overridden',
          'lerna:postcss-discard-unused': 'postcss-discard-unused',
          'lerna:postcss-merge-idents': 'postcss-merge-idents',
          'lerna:postcss-merge-longhand': 'postcss-merge-longhand',
          'lerna:postcss-merge-rules': 'postcss-merge-rules',
          'lerna:postcss-minify-font-values': 'postcss-minify-font-values',
          'lerna:postcss-minify-gradients': 'postcss-minify-gradients',
          'lerna:postcss-minify-params': 'postcss-minify-params',
          'lerna:postcss-minify-selectors': 'postcss-minify-selectors',
          'lerna:postcss-normalize-charset': 'postcss-normalize-charset',
          'lerna:postcss-normalize-display-values':
            'postcss-normalize-display-values',
          'lerna:postcss-normalize-positions': 'postcss-normalize-positions',
          'lerna:postcss-normalize-repeat-style':
            'postcss-normalize-repeat-style',
          'lerna:postcss-normalize-string': 'postcss-normalize-string',
          'lerna:postcss-normalize-timing-functions':
            'postcss-normalize-timing-functions',
          'lerna:postcss-normalize-unicode': 'postcss-normalize-unicode',
          'lerna:postcss-normalize-url': 'postcss-normalize-url',
          'lerna:postcss-normalize-whitespace': 'postcss-normalize-whitespace',
          'lerna:postcss-ordered-values': 'postcss-ordered-values',
          'lerna:postcss-reduce-idents': 'postcss-reduce-idents',
          'lerna:postcss-reduce-initial': 'postcss-reduce-initial',
          'lerna:postcss-reduce-transforms': 'postcss-reduce-transforms',
          'lerna:postcss-svgo': 'postcss-svgo',
          'lerna:postcss-unique-selectors': 'postcss-unique-selectors',
          'lerna:postcss-zindex': 'postcss-zindex',
          'lerna:stylehacks': 'stylehacks',
          'lerna:cssnano-util-raw-cache': 'cssnano-util-raw-cache',
        },
      },
    ]);
  } else if (env === 'test') {
    plugins.push('add-module-exports');
    plugins.push([
      'module-resolver',
      {
        cwd: path.resolve('./packages'),
        alias: {
          'lerna:css-size': './css-size/src/index.js',
          'lerna:cssnano': './cssnano/src/index.js',
          'lerna:cssnano-preset-advanced':
            './cssnano-preset-advanced/src/index.js',
          'lerna:cssnano-preset-default':
            './cssnano-preset-default/src/index.js',
          'lerna:cssnano-util-get-arguments':
            './cssnano-util-get-arguments/src/index.js',
          'lerna:cssnano-util-get-match':
            './cssnano-util-get-match/src/index.js',
          'lerna:cssnano-util-same-parent':
            './cssnano-util-same-parent/src/index.js',
          'lerna:cssnano-utils': './cssnano-utils/src/index.js',
          'lerna:postcss-colormin': './postcss-colormin/src/index.js',
          'lerna:postcss-convert-values':
            './postcss-convert-values/src/index.js',
          'lerna:postcss-discard-comments':
            './postcss-discard-comments/src/index.js',
          'lerna:postcss-discard-duplicates':
            './postcss-discard-duplicates/src/index.js',
          'lerna:postcss-discard-empty': './postcss-discard-empty/src/index.js',
          'lerna:postcss-discard-overridden':
            './postcss-discard-overridden/src/index.js',
          'lerna:postcss-discard-unused':
            './postcss-discard-unused/src/index.js',
          'lerna:postcss-merge-idents': './postcss-merge-idents/src/index.js',
          'lerna:postcss-merge-longhand':
            './postcss-merge-longhand/src/index.js',
          'lerna:postcss-merge-rules': './postcss-merge-rules/src/index.js',
          'lerna:postcss-minify-font-values':
            './postcss-minify-font-values/src/index.js',
          'lerna:postcss-minify-gradients':
            './postcss-minify-gradients/src/index.js',
          'lerna:postcss-minify-params': './postcss-minify-params/src/index.js',
          'lerna:postcss-minify-selectors':
            './postcss-minify-selectors/src/index.js',
          'lerna:postcss-normalize-charset':
            './postcss-normalize-charset/src/index.js',
          'lerna:postcss-normalize-display-values':
            './postcss-normalize-display-values/src/index.js',
          'lerna:postcss-normalize-positions':
            './postcss-normalize-positions/src/index.js',
          'lerna:postcss-normalize-repeat-style':
            './postcss-normalize-repeat-style/src/index.js',
          'lerna:postcss-normalize-string':
            './postcss-normalize-string/src/index.js',
          'lerna:postcss-normalize-timing-functions':
            './postcss-normalize-timing-functions/src/index.js',
          'lerna:postcss-normalize-unicode':
            './postcss-normalize-unicode/src/index.js',
          'lerna:postcss-normalize-url': './postcss-normalize-url/src/index.js',
          'lerna:postcss-normalize-whitespace':
            './postcss-normalize-whitespace/src/index.js',
          'lerna:postcss-ordered-values':
            './postcss-ordered-values/src/index.js',
          'lerna:postcss-reduce-idents': './postcss-reduce-idents/src/index.js',
          'lerna:postcss-reduce-initial':
            './postcss-reduce-initial/src/index.js',
          'lerna:postcss-reduce-transforms':
            './postcss-reduce-transforms/src/index.js',
          'lerna:postcss-svgo': './postcss-svgo/src/index.js',
          'lerna:postcss-unique-selectors':
            './postcss-unique-selectors/src/index.js',
          'lerna:postcss-zindex': './postcss-zindex/src/index.js',
          'lerna:stylehacks': './stylehacks/src/index.js',
          'lerna:cssnano-util-raw-cache':
            './cssnano-util-raw-cache/src/index.js',
        },
      },
    ]);
  }

  return {
    targets: { node: '10.13.0' },
    presets: ['@babel/preset-env'],
    plugins,
  };
};
