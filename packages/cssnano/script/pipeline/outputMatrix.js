/**
 * Prints what each configuration of the presets makes of each input: the
 * output, then each message the run reports (type, plugin, text, line and
 * column). The gate compares this text between a commit and its baseline, so
 * a byte that moves shows up in one place. An input that throws prints its
 * error and the run goes on.
 *
 * Inputs are the framework stylesheets and `edgeCases.css`, which holds the
 * cases the host walk and the merge pass treat by their text. Run from
 * packages/cssnano:
 *
 *   node script/pipeline/outputMatrix.js > ../../../cssnano-gate/<item>-matrix.txt
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import advancedPreset from '../../src/presets/advanced.js';
import defaultPreset from '../../src/presets/default.js';
import litePreset from '../../src/presets/lite.js';

const frameworksDir = fileURLToPath(
  new URL('../../../../frameworks/', import.meta.url)
);
const edgeCasesFile = fileURLToPath(
  new URL('./edgeCases.css', import.meta.url)
);

/**
 * Each configuration: its preset, and the options that change it. `disable`
 * turns one plugin off by its preset option; `options` sets a plugin's options.
 *
 * @type {{name: string, preset: (options?: object) => unknown, options: object}[]}
 */
const CONFIGURATIONS = [
  { name: 'preset lite', preset: litePreset, options: {} },
  { name: 'preset default', preset: defaultPreset, options: {} },
  { name: 'preset advanced', preset: advancedPreset, options: {} },
  ...[
    'discardComments',
    'minifySelectors',
    'minifyParams',
    'normalizeWhitespace',
    'merge',
  ].map((plugin) => ({
    name: `default without ${plugin}`,
    preset: defaultPreset,
    options: { disable: [plugin] },
  })),
  {
    name: 'discardComments remove keeps every comment',
    preset: defaultPreset,
    options: { options: { discardComments: { remove: () => false } } },
  },
  {
    name: 'discardComments removeAll',
    preset: defaultPreset,
    options: { options: { discardComments: { removeAll: true } } },
  },
];

/**
 * @param {string} name
 * @param {string} css
 * @return {Promise<string>} the lines of one input under one configuration
 */
async function reportOf(name, css, configuration) {
  const header = `== ${configuration.name} | ${name}\n`;
  try {
    const result = await postcss(
      configuration.preset(configuration.options)
    ).process(css, { from: undefined });
    let text = `${header}${result.css}\n-- messages\n`;
    for (const message of result.messages) {
      const start = message.node?.source?.start;
      text += [
        message.type,
        message.plugin ?? '-',
        JSON.stringify(message.text ?? ''),
        start?.line ?? '-',
        start?.column ?? '-',
      ].join('\t');
      text += '\n';
    }
    return text;
  } catch (error) {
    return `${header}ERROR ${error.message}\n`;
  }
}

/** @type {[string, string][]} */
const inputs = [];
for (const file of readdirSync(frameworksDir).toSorted()) {
  inputs.push([file, readFileSync(join(frameworksDir, file), 'utf8')]);
}
inputs.push(['edgeCases.css', readFileSync(edgeCasesFile, 'utf8')]);

let out = '';
for (const configuration of CONFIGURATIONS) {
  for (const [name, css] of inputs) {
    out += await reportOf(name, css, configuration);
  }
}
process.stdout.write(out);
