import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

/* Every target supports the axis shorthands, which shipped after the
 * longhands, so they may be created and grown. */
const modern = { overrideBrowserslist: ['chrome 120'] };
/* Internet Explorer 11 has none of them, and drops a shorthand it does not
 * know together with every side it would have set. */
const legacy = { overrideBrowserslist: ['ie 11'] };

const groups = [
  'margin',
  'padding',
  'inset',
  'scroll-margin',
  'scroll-padding',
];

describe('lone axis shorthand', () => {
  for (const group of groups) {
    for (const axis of ['block', 'inline']) {
      test(
        `collapses equal values of ${group}-${axis} to one because a single value sets both edges`,
        processCSS(
          `a{${group}-${axis}:4px 4px}`,
          `a{${group}-${axis}:4px}`,
          modern
        )
      );
    }
  }

  test(
    'collapses an axis shorthand for targets without it because the property stays the same',
    processCSS('a{margin-block:4px 4px}', 'a{margin-block:4px}', legacy)
  );

  test(
    'keeps a start and an end that differ',
    passthroughCSS('a{margin-block:4px 5px}', modern)
  );

  test(
    'compares values token for token, so 0 and 0px stay apart because only the plugin may not know they are equal',
    passthroughCSS('a{margin-block:0 0px}', modern)
  );

  test(
    'does not look inside calc() for equal values',
    passthroughCSS('a{margin-inline:calc(1px + 1px) calc(2px)}', modern)
  );

  test(
    'keeps equal values that hold a substitution because it may stand for several tokens',
    passthroughCSS('a{margin-inline:var(--x) var(--x)}', modern)
  );
});

describe('start and end longhands', () => {
  for (const group of groups) {
    for (const axis of ['block', 'inline']) {
      test(
        `merges ${group}-${axis}-start and -end into ${group}-${axis} when every target supports it`,
        processCSS(
          `a{${group}-${axis}-start:1px;${group}-${axis}-end:2px}`,
          `a{${group}-${axis}:1px 2px}`,
          modern
        )
      );
    }
  }

  test(
    'merges equal start and end into a single value',
    processCSS(
      'a{padding-block-start:3px;padding-block-end:3px}',
      'a{padding-block:3px}',
      modern
    )
  );

  test(
    'merges the end before the start in the order of the axis',
    processCSS(
      'a{margin-inline-end:2px;margin-inline-start:1px}',
      'a{margin-inline:1px 2px}',
      modern
    )
  );

  test(
    'merges both axes independently because they set different sides in every writing mode',
    processCSS(
      'a{margin-inline-start:1px;margin-block-start:3px;margin-inline-end:2px;margin-block-end:4px}',
      'a{margin-inline:1px 2px;margin-block:3px 4px}',
      modern
    )
  );

  test(
    'folds a longhand into the shorthand before it',
    processCSS(
      'a{margin-block:8px 4px;margin-block-start:6px}',
      'a{margin-block:6px 4px}',
      modern
    )
  );

  test(
    'folds a shorthand over the longhands before it',
    processCSS(
      'a{margin-block-start:1px;margin-block-end:2px;margin-block:3px}',
      'a{margin-block:3px}',
      modern
    )
  );

  test(
    'keeps the longhands apart for a target without the axis shorthand because it would drop both edges',
    passthroughCSS('a{margin-block-start:1px;margin-block-end:2px}', legacy)
  );

  test(
    'keeps inset longhands apart for a target without inset',
    passthroughCSS('a{inset-inline-start:1px;inset-inline-end:2px}', legacy)
  );

  test(
    'keeps scroll-margin longhands apart for Safari 14.0, which lacks the axis shorthand',
    passthroughCSS(
      'a{scroll-margin-block-start:1px;scroll-margin-block-end:2px}',
      {
        overrideBrowserslist: ['safari 14'],
      }
    )
  );

  test(
    'does not fold a longhand into an existing axis shorthand for Chrome 80, which applies the longhand alone',
    processCSS(
      'a{padding-inline:1px 2px;padding-inline-end:3px}',
      'a{padding-inline:1px;padding-inline-end:3px}',
      { overrideBrowserslist: ['chrome 80'] }
    )
  );

  test(
    'keeps a longhand before its axis shorthand for UC Browser, which may apply the longhand alone because the compatibility data does not cover it',
    passthroughCSS('a{margin-inline-start:1px;margin-inline:2px}', {
      overrideBrowserslist: ['chrome 120', 'and_uc 15.5'],
    })
  );

  test(
    'frees the overridden edge of a shorthand that cannot absorb its override',
    processCSS(
      'a{margin-block:8px 4px;margin-block-start:6px}',
      'a{margin-block:4px;margin-block-start:6px}',
      legacy
    )
  );
});

describe('axes never combine', () => {
  test(
    'leaves a block and an inline shorthand apart because no shorthand sets both',
    passthroughCSS('a{margin-block:1px;margin-inline:1px}', modern)
  );

  test(
    'leaves a block and an inline longhand apart',
    passthroughCSS(
      'a{padding-block-start:1px;padding-inline-start:1px}',
      modern
    )
  );
});

describe('a longhand of the other axis', () => {
  test(
    'does not stop a fold because it sets other sides in every writing mode',
    processCSS(
      'a{margin-block-start:1px;margin-inline-start:9px;margin-block-end:2px}',
      'a{margin-inline-start:9px;margin-block:1px 2px}',
      modern
    )
  );
});
