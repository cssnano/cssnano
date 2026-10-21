import path from 'node:path';
import fs from 'node:fs';
import postcss from 'postcss';
import assert from 'node:assert/strict';
import { repositoryFile } from './testHelpers.js';
import {
  presetEntriesKey,
  transformsOf,
} from '../packages/cssnano/src/presets/presetEntries.js';

function firstDifference(actual, expected) {
  let index = 0;
  while (
    index < actual.length &&
    index < expected.length &&
    actual[index] === expected[index]
  ) {
    index++;
  }
  return index;
}

function mismatchMessage(framework, actual, expected) {
  const index = firstDifference(actual, expected);
  const context = 40;
  const start = Math.max(0, index - context);
  const end = index + context;
  return [
    `Framework "${framework}" output differs at character ${index}`,
    `actual  (${actual.length} chars): ${JSON.stringify(actual.slice(start, end))}`,
    `expected (${expected.length} chars): ${JSON.stringify(expected.slice(start, end))}`,
  ].join('\n');
}

/**
 * @param {() => import('postcss').AcceptedPlugin[]} preset builds the plugins
 *   of a preset; each framework gets its own, so no plugin keeps state between them
 * @param {string} integrations
 */
export function integrationTests(preset, integrations) {
  const presetName = path.basename(path.resolve(integrations, '..'));
  const frameworks = new Map();
  for (const framework of fs.readdirSync(
    path.join(import.meta.dirname, '../frameworks')
  )) {
    frameworks.set(
      path.basename(framework, '.css'),
      fs.readFileSync(
        path.join(import.meta.dirname, '../frameworks', framework),
        'utf8'
      )
    );
  }

  return async (t) =>
    Promise.allSettled(
      Array.from(frameworks, ([framework, css]) =>
        t.test(`${presetName} - ${framework}`, async () => {
          const result = await postcss(preset()).process(css, {
            from: repositoryFile,
          });
          const expected = fs.readFileSync(
            path.join(integrations, `${framework}.css`),
            'utf8'
          );
          if (result.css !== expected) {
            assert.fail(mismatchMessage(framework, result.css, expected));
          }
        })
      )
    );
}

/**
 * @param {() => import('postcss').AcceptedPlugin[]} preset builds the plugins
 *   of a preset, so each run gets its own
 * @param {string} integrations
 */
export function idempotencyTests(preset, integrations) {
  const presetName = path.basename(path.resolve(integrations, '..'));
  const integrationsByFramework = new Map();
  for (const integration of fs.readdirSync(integrations)) {
    if (path.extname(integration) === '.css') {
      integrationsByFramework.set(
        path.basename(integration, '.css'),
        fs.readFileSync(path.join(integrations, integration), 'utf8')
      );
    }
  }

  return async (t) =>
    Promise.allSettled(
      Array.from(integrationsByFramework, ([framework, css]) =>
        t.test(`${presetName} - ${framework}`, async () => {
          const result = await postcss(preset()).process(css, {
            from: repositoryFile,
          });
          if (result.css !== css) {
            assert.fail(mismatchMessage(framework, result.css, css));
          }
        })
      )
    );
}

/**
 * Each option of a preset runs alone, so a plugin that hosts transforms is
 * tested one transform at a time.
 *
 * @param {(options?: object) => import('postcss').AcceptedPlugin[]} preset
 *   builds the plugins of a preset, so each run gets its own instances
 * @param {string} integrations
 * @param {string[]} [excludedOptions] options to leave out, such as mergeRules
 */
export function pluginIdempotencyTests(
  preset,
  integrations,
  excludedOptions = []
) {
  const presetName = path.basename(path.resolve(integrations, '..'));
  const frameworks = [];
  for (const file of fs.readdirSync(integrations)) {
    if (path.extname(file) === '.css') {
      frameworks.push({
        name: path.basename(file, '.css'),
        css: fs.readFileSync(path.join(integrations, file), 'utf8'),
      });
    }
  }
  const aggregateCSS = frameworks
    .map(({ name, css: frameworkCSS }) => `/* ${name} */\n${frameworkCSS}`)
    .join('\n');
  // Parsing the corpus dominates each run; plugins mutate their input, so
  // each one gets a clone of a single parse.
  const aggregateRoot = postcss.parse(aggregateCSS);

  const optionNames = preset[presetEntriesKey].flatMap(([, option, settings]) =>
    transformsOf(option, settings).map(({ name }) => name)
  );

  return async (t) => {
    const tests = [];
    for (const name of optionNames) {
      if (excludedOptions.includes(name)) continue;
      // Disabling the others leaves this option's plugin alone. Each build is
      // fresh, so the two runs share no plugin instance.
      const others = optionNames.filter((option) => option !== name);
      tests.push(
        t.test(`${presetName} - ${name}`, async () => {
          const firstPass = await postcss(preset({ disable: others })).process(
            aggregateRoot.clone(),
            { from: repositoryFile }
          );
          const secondPass = await postcss(preset({ disable: others })).process(
            firstPass.css,
            { from: repositoryFile }
          );
          if (secondPass.css !== firstPass.css) {
            assert.fail(mismatchMessage(name, secondPass.css, firstPass.css));
          }
        })
      );
    }
    return Promise.allSettled(tests);
  };
}
