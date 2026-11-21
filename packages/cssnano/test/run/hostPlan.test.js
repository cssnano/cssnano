import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { hostPlan, isEmptyPlan } from '../../src/run/hostPlan.js';
import {
  configureValidated,
  planOf,
} from '../../src/presets/configurePlugins.js';
import { advancedPresetEntries } from '../../src/presets/advancedPlugins.js';
import { defaultPluginEntries } from '../../src/presets/defaultPlugins.js';
import { litePluginEntries } from '../../src/presets/litePlugins.js';

/**
 * The names of the plan's fields that are set: a list with an entry, or a
 * field that is not undefined.
 *
 * @param {Record<string, unknown>} plan
 * @returns {string[]}
 */
function fieldsOn(plan) {
  return Object.keys(plan)
    .filter((key) => {
      const value = plan[key];
      return Array.isArray(value) ? value.length > 0 : value !== undefined;
    })
    .toSorted();
}

/** One value per field, so that setting any one field makes a plan non-empty. */
const sampleOf = /** @type {Record<string, unknown>} */ ({
  members: [{ entry: { create: () => null }, options: {}, targets: false }],
  symbols: [{ transform: () => {}, options: {} }],
  merge: { options: {}, runner: {} },
});

describe('the plan of a host', () => {
  test('a plan with no field set is empty', () => {
    assert.equal(isEmptyPlan(hostPlan()), true);
  });

  test('a plan with one field set is not empty, whichever field it is', () => {
    for (const key of Object.keys(hostPlan())) {
      // consistencyChecks and browserslist only tune a run that has something to do.
      if (key === 'consistencyChecks' || key === 'browserslist') continue;
      const plan = hostPlan(
        /** @type {Parameters<typeof hostPlan>[0]} */ (
          /** @type {unknown} */ ({ [key]: sampleOf[key] ?? {} })
        )
      );
      assert.equal(
        isEmptyPlan(plan),
        false,
        `field ${key} makes a plan non-empty`
      );
    }
  });

  test('consistencyChecks alone leaves a plan empty', () => {
    assert.equal(isEmptyPlan(hostPlan({ consistencyChecks: false })), true);
  });

  test('configureValidated of no entries returns no plugin', () => {
    assert.deepEqual(configureValidated([], {}), []);
  });
});

describe('the fields the presets fill', () => {
  test('the default preset fills the stage, the six transforms and the merge', () => {
    assert.deepEqual(
      fieldsOn(planOf(defaultPluginEntries, {})),
      [
        'discardEmpty',
        'discardOverridden',
        'members',
        'merge',
        'normalizeCharset',
        'normalizeWhitespace',
        'rawCache',
        'uniqueSelectors',
      ].toSorted()
    );
  });

  test('the lite preset fills only the stages of comments and whitespace, and the empty and cache transforms', () => {
    assert.deepEqual(
      fieldsOn(planOf(litePluginEntries, {})),
      ['discardEmpty', 'members', 'normalizeWhitespace', 'rawCache'].toSorted()
    );
  });

  test('the advanced preset fills the default fields and the symbol transforms', () => {
    assert.deepEqual(
      fieldsOn(planOf(advancedPresetEntries, {})),
      [
        'discardEmpty',
        'discardOverridden',
        'members',
        'merge',
        'normalizeCharset',
        'normalizeWhitespace',
        'rawCache',
        'symbols',
        'uniqueSelectors',
      ].toSorted()
    );
  });

  test('disabling discardEmpty leaves its field unset and the rest as the default preset', () => {
    assert.deepEqual(
      fieldsOn(planOf(defaultPluginEntries, { disable: ['discardEmpty'] })),
      [
        'discardOverridden',
        'members',
        'merge',
        'normalizeCharset',
        'normalizeWhitespace',
        'rawCache',
        'uniqueSelectors',
      ].toSorted()
    );
  });

  test('the symbol transforms of the advanced preset run in entry order', () => {
    const plan = planOf(advancedPresetEntries, {});
    const expected = advancedPresetEntries
      .map(([, , settings]) => settings.symbols)
      .filter((transform) => transform !== undefined);
    assert.deepEqual(
      plan.symbols.map(({ transform }) => transform),
      expected
    );
  });
});
