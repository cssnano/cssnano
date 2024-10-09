import postcss from 'postcss';
import cssnano from 'cssnano';
import syntaxHighlight from '@11ty/eleventy-plugin-syntaxhighlight';
import { EleventyRenderPlugin, EleventyHtmlBasePlugin } from '@11ty/eleventy';
import markdownItAnchor from 'markdown-it-anchor';
import markdownIt from 'markdown-it';
import fs from 'fs';

const cssnanoPackageInfo = JSON.parse(
  fs.readFileSync('../packages/cssnano/package.json', 'utf8')
);
const cssnanoVersion = cssnanoPackageInfo.version;
const processor = postcss([cssnano]);

export default function (config) {
  // tabindex makes scrollable code samples accesible
  config.addPlugin(syntaxHighlight, { preAttributes: { tabindex: 0 } });
  config.addPlugin(EleventyRenderPlugin);
  config.addPlugin(EleventyHtmlBasePlugin);
  config.addGlobalData('site_url', 'https://cssnano.github.io/cssnano');
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
    pathPrefix: '/cssnano/',
  };
}
