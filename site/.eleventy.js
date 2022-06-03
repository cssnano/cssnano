const postcss = require('postcss');
const cssnano = require('cssnano');
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const { EleventyRenderPlugin } = require('@11ty/eleventy');
const markdownItAnchor = require('markdown-it-anchor');
const markdownIt = require('markdown-it');
const cssnanoVersion = require('../packages/cssnano/package.json').version;

const processor = postcss([cssnano]);
module.exports = (config) => {
  config.setBrowserSyncConfig({
    snippet: false,
  });
  // tabindex makes scrollable code samples accesible
  config.addPlugin(syntaxHighlight, { preAttributes: { tabindex: 0 } });
  config.addPlugin(EleventyRenderPlugin);
  config.addGlobalData('site_url', 'https://cssnano.co');
  config.addGlobalData('cssnano_version', cssnanoVersion);
  // Automatically minify CSS on build
  config.addTemplateFormats('css');
  config.addExtension('css', {
    outputFileExtension: 'css',
    compile: async function (inputContent, inputPath) {
      const result = await processor.process(inputContent, { from: inputPath });
      return async () => {
        return result.css;
      };
    },
  });
  config.addPassthroughCopy('./src/img/');
  config.addPassthroughCopy('./src/CNAME');
  config.addPassthroughCopy('./src/.nojekyll');

  /* Allow HTML in Markdown files and
    automatically turn Markdown headers into anchors */
  config.setLibrary(
    'md',
    markdownIt({ html: true }).use(markdownItAnchor, {
      level: [2, 3],
      permalink: markdownItAnchor.permalink.headerLink(),
    })
  );
  return {
    markdownTemplateEngine: 'njk',
  };
};
