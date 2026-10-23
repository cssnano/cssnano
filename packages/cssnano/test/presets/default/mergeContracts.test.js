import { test } from 'node:test';
import preset from '../../../src/presets/default.js';
import { transformPass } from '../../../src/passes/merge/index.js';
import { configureValidated } from '../../../src/presets/configurePlugins.js';
import { defaultPluginEntries } from '../../../src/presets/defaultPlugins.js';
import { processCSSFactory } from '../../../../../util/testHelpers.js';

const { processCSS } = processCSSFactory(preset());
const withoutRules = processCSSFactory(
  preset({ options: { merge: { rules: false } } })
);

/**
 * The default preset with its merge plugin replaced by the given transforms,
 * each run alone in the merge plugin's place. No option turns off longhand
 * merging alone, so a test that needs that combination composes it here.
 *
 * @param {('mergeLonghand' | 'discardDuplicates' | 'mergeRules')[]} transforms
 * @return {import('postcss').AcceptedPlugin[]}
 */
function presetWithMergeTransforms(transforms) {
  // The default entries, with the merge entry replaced by the transforms, each
  // a pass of its own in the place the merge pass has.
  const entries = defaultPluginEntries.flatMap(([entry, name, settings]) =>
    name === 'merge'
      ? transforms.map((transform) => [
          {
            create: (/** @type {Record<PropertyKey, unknown>} */ options) =>
              options,
          },
          transform,
          {
            targets: true,
            transform: true,
            pass: transformPass(transform),
            optionKeys: [],
          },
        ])
      : [[entry, name, settings]]
  );
  return configureValidated(entries, {});
}

const withoutLonghand = processCSSFactory(
  presetWithMergeTransforms(['discardDuplicates', 'mergeRules'])
);

// Each case is a saving or trade-off that a framework fixture relies on. Each
// input depends on the phase order it pins, so the companion case with the
// other phase disabled must lose the saving.

test(
  'drops the dead margin:0 once mergeRules joins the two body rules (gutenberg body margin)',
  processCSS(
    'body{margin:0;padding:0}body{margin:0 auto}',
    'body{padding:0;margin:0 auto}'
  )
);

test(
  'keeps the dead margin:0 in its own rule when rule merging is off (gutenberg body margin)',
  withoutRules.passthroughCSS('body{margin:0;padding:0}body{margin:0 auto}')
);

test(
  'joins the body rules but keeps the dead margin:0 when mergeLonghand is off, because the second longhand pass removes it (gutenberg body margin)',
  withoutLonghand.processCSS(
    'body{margin:0;padding:0}body{margin:0 auto}',
    'body{margin:0;padding:0;margin:0 auto}'
  )
);

test(
  'joins pre with td and th once mergeLonghand folds padding:1rem 1rem to padding:1rem (kube padding)',
  processCSS(
    'pre{padding:1rem}th,td{padding:1rem 1rem;border-bottom:1px solid red}',
    'pre,td,th{padding:1rem}td,th{border-bottom:1px solid red}'
  )
);

test(
  'keeps pre apart from td and th when mergeLonghand is off, because the padding value is not yet folded (kube padding)',
  withoutLonghand.processCSS(
    'pre{padding:1rem}th,td{padding:1rem 1rem;border-bottom:1px solid red}',
    'pre{padding:1rem}td,th{padding:1rem 1rem;border-bottom:1px solid red}'
  )
);

test(
  'folds border-left:none and border-left-width:0 into border-left:0 (semantic-ui buttons)',
  processCSS('.a{border-left:none}.a{border-left-width:0}', '.a{border-left:0}')
);

test(
  'keeps the tabs border-bottom-color unshared, because the longhands fold to border-bottom first (bulma tabs)',
  processCSS(
    '.a{border-bottom-width:1px;border-bottom-style:solid;border-bottom-color:#dbdbdb;color:red}.b{border-bottom-color:#dbdbdb;color:blue}',
    '.a{border-bottom:1px solid #dbdbdb;color:red}.b{border-bottom-color:#dbdbdb;color:blue}'
  )
);
