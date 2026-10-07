import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

/* Chrome 69, Firefox 90 and Safari 14.1 support the scroll-margin shorthand
 * without the partial implementations that came before. */
const modern = { overrideBrowserslist: ['chrome 120'] };
const legacy = { overrideBrowserslist: ['ie 11'] };
const safari14 = { overrideBrowserslist: ['safari 14'] };

for (const group of ['scroll-margin', 'scroll-padding']) {
  describe(group, () => {
    test(
      `merges the four ${group} longhands into the shorthand when every target supports it`,
      processCSS(
        `a{${group}-top:1px;${group}-right:2px;${group}-bottom:1px;${group}-left:2px}`,
        `a{${group}:1px 2px}`,
        modern
      )
    );

    test(
      `keeps the ${group} longhands apart for Safari 14.0, which predates the shorthand`,
      passthroughCSS(
        `a{${group}-top:1px;${group}-right:1px;${group}-bottom:1px;${group}-left:1px}`,
        safari14
      )
    );

    test(
      `keeps the ${group} longhands apart for a target without the shorthand`,
      passthroughCSS(
        `a{${group}-top:1px;${group}-right:1px;${group}-bottom:1px;${group}-left:1px}`,
        legacy
      )
    );

    test(
      `drops a ${group} longhand that a later shorthand overrides when every target supports it`,
      processCSS(`a{${group}-top:1px;${group}:2px}`, `a{${group}:2px}`, modern)
    );

    test(
      `keeps a ${group} longhand before the shorthand for Safari 14.0, where it is the fallback`,
      passthroughCSS(`a{${group}-top:1px;${group}:2px}`, safari14)
    );

    test(
      `condenses repeated sides of ${group} for any target`,
      processCSS(`a{${group}:1px 2px 1px 2px}`, `a{${group}:1px 2px}`, legacy)
    );

    test(
      `folds a later longhand into ${group}`,
      processCSS(
        `a{${group}:1px 2px;${group}-top:3px}`,
        `a{${group}:3px 2px 1px}`,
        modern
      )
    );

    test(
      `drops a flow-relative ${group} longhand that the four sides override`,
      processCSS(
        `a{${group}-inline-start:5px;${group}:10px}`,
        `a{${group}:10px}`,
        legacy
      )
    );

    test(
      `merges the block axis of ${group} when the targets support it`,
      processCSS(
        `a{${group}-block-start:1px;${group}-block-end:2px}`,
        `a{${group}-block:1px 2px}`,
        modern
      )
    );
  });
}

describe('scroll-margin values', () => {
  test(
    'keeps percentages unmerged because scroll-margin takes lengths only',
    passthroughCSS(
      'a{scroll-margin-top:5%;scroll-margin-right:5%;scroll-margin-bottom:5%;scroll-margin-left:5%}',
      modern
    )
  );

  test(
    'keeps scroll-margin with a percentage as written because a browser drops it',
    passthroughCSS('a{scroll-margin:10%}', modern)
  );

  test(
    'keeps a percentage inside calc() unmerged because scroll-margin takes lengths only',
    passthroughCSS(
      'a{scroll-margin-top:calc(10%);scroll-margin-right:1px;scroll-margin-bottom:1px;scroll-margin-left:1px}',
      modern
    )
  );

  test(
    'keeps scroll-margin with auto as written because a browser drops it',
    passthroughCSS('a{scroll-margin:auto}', modern)
  );

  test(
    'merges negative lengths because scroll-margin allows them',
    processCSS(
      'a{scroll-margin-top:-1px;scroll-margin-right:-1px;scroll-margin-bottom:-1px;scroll-margin-left:-1px}',
      'a{scroll-margin:-1px}',
      modern
    )
  );

  test(
    'keeps the legacy scroll-snap-margin-top between two scroll-margin declarations from being folded across, because an engine may treat it as an alias',
    passthroughCSS(
      'a{scroll-margin-top:1px;scroll-snap-margin-top:2px;scroll-margin-right:1px;scroll-margin-bottom:1px;scroll-margin-left:1px}',
      modern
    )
  );

  test(
    'does not drop or rewrite scroll-snap-margin declarations',
    processCSS(
      'a{scroll-snap-margin-top:2px;scroll-margin-top:1px;scroll-margin-right:1px;scroll-margin-bottom:1px;scroll-margin-left:1px}',
      'a{scroll-snap-margin-top:2px;scroll-margin:1px}',
      modern
    )
  );
});

describe('scroll-padding values', () => {
  test(
    'merges auto sides because scroll-padding takes auto',
    processCSS(
      'a{scroll-padding-top:auto;scroll-padding-right:auto;scroll-padding-bottom:auto;scroll-padding-left:auto}',
      'a{scroll-padding:auto}',
      modern
    )
  );

  test(
    'keeps scroll-padding with a negative length as written because a browser drops it',
    passthroughCSS('a{scroll-padding:-1px}', modern)
  );

  test(
    'keeps a negative side unmerged because a browser drops it',
    passthroughCSS(
      'a{scroll-padding-top:-1px;scroll-padding-right:1px;scroll-padding-bottom:1px;scroll-padding-left:1px}',
      modern
    )
  );

  test(
    'keeps scroll-margin and scroll-padding apart as two groups',
    passthroughCSS(
      'a{scroll-margin-top:1px;scroll-padding-top:1px;scroll-margin-right:1px}',
      modern
    )
  );
});
