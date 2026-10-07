import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { processCSS, passthroughCSS } = processCSSFactory(plugin);

/* A flow-relative property names a physical side only once the element's
 * writing-mode and direction are known, and any other rule may set them. So
 * each case has to hold for all of them. */
const modern = { overrideBrowserslist: ['chrome 120'] };
const legacy = { overrideBrowserslist: ['ie 11'] };

describe('folding across a declaration of the other kind', () => {
  test(
    'keeps a flow-relative longhand where it is when a physical declaration sits between it and its shorthand, because the physical one may set the same side',
    processCSS(
      'a{margin-block:8px 4px;margin-top:1px;margin-block-start:6px}',
      'a{margin-block:4px;margin-top:1px;margin-block-start:6px}',
      modern
    )
  );

  test(
    'keeps physical longhands apart when a flow-relative declaration sits between them, because it may set the same side',
    passthroughCSS(
      'a{margin-top:1px;margin-right:2px;margin-inline-start:0;margin-bottom:3px;margin-left:4px}',
      modern
    )
  );

  test(
    'keeps physical longhands apart when a flow-relative padding sits between them',
    passthroughCSS(
      'a{padding-top:10px;padding-right:10px;padding-inline-end:20px;padding-bottom:10px;padding-left:10px}',
      modern
    )
  );

  test(
    'keeps physical insets apart when a flow-relative inset sits between them',
    passthroughCSS(
      'a{top:0;right:0;inset-block-end:1px;bottom:0;left:0}',
      modern
    )
  );

  test(
    'keeps a physical longhand after a flow-relative one in order',
    passthroughCSS('a{margin-block-start:1px;margin-top:2px}', modern)
  );

  test(
    'still folds physical longhands across a flow-relative declaration of another group',
    processCSS(
      'a{margin-top:1px;margin-right:1px;padding-inline-end:2px;margin-bottom:1px;margin-left:1px}',
      'a{padding-inline-end:2px;margin:1px}',
      modern
    )
  );

  test(
    'keeps scroll-margin longhands apart across the legacy scroll-snap-margin alias',
    passthroughCSS(
      'a{scroll-margin-top:1px;scroll-snap-margin-top:2px;scroll-margin-right:1px;scroll-margin-bottom:1px;scroll-margin-left:1px}',
      modern
    )
  );

  test(
    'keeps margin longhands apart across the prefixed -webkit-margin-start alias',
    passthroughCSS(
      'a{margin-top:1px;margin-right:1px;-webkit-margin-start:2px;margin-bottom:1px;margin-left:1px}',
      modern
    )
  );

  test(
    'keeps margin longhands apart across an unknown margin property',
    passthroughCSS(
      'a{margin-top:1px;margin-right:1px;margin-trim:block;margin-bottom:1px;margin-left:1px}',
      modern
    )
  );
});

describe('declarations dead in every writing mode', () => {
  test(
    'drops margin-block-start when margin-top, margin-left and margin-right follow because block-start is never the bottom',
    processCSS(
      'a{margin-block-start:1px;margin-top:2px;margin-left:3px;margin-right:4px}',
      'a{margin-top:2px;margin-left:3px;margin-right:4px}',
      modern
    )
  );

  test(
    'drops margin-block-end when margin-bottom, margin-left and margin-right follow because block-end is never the top',
    processCSS(
      'a{margin-block-end:1px;margin-bottom:2px;margin-left:3px;margin-right:4px}',
      'a{margin-bottom:2px;margin-left:3px;margin-right:4px}',
      modern
    )
  );

  test(
    'keeps margin-block-start when only margin-top follows because a vertical writing mode puts it on the right or left',
    passthroughCSS('a{margin-block-start:1px;margin-top:2px}', modern)
  );

  test(
    'keeps margin-block-end when only margin-bottom follows',
    passthroughCSS('a{margin-block-end:1px;margin-bottom:2px}', modern)
  );

  test(
    'keeps margin-inline-start when only margin-left follows because it sets the top or bottom in a vertical mode',
    passthroughCSS('a{margin-inline-start:1px;margin-left:2px}', modern)
  );

  test(
    'keeps margin-inline when margin-left and margin-right follow because vertical modes map the inline axis to top and bottom',
    passthroughCSS(
      'a{margin-inline:1px 2px;margin-left:3px;margin-right:3px}',
      modern
    )
  );

  test(
    'drops a flow-relative longhand when all four physical sides follow',
    processCSS(
      'a{padding-inline-start:5px;padding:10px}',
      'a{padding:10px}',
      modern
    )
  );

  test(
    'drops a flow-relative longhand when all four physical sides follow, for a target without flow-relative support too, because that target ignores it',
    processCSS(
      'a{margin-inline-start:5px;margin:10px}',
      'a{margin:10px}',
      legacy
    )
  );

  test(
    'drops a physical shorthand when both flow-relative axes follow it',
    processCSS(
      'a{margin:1px;margin-block:2px;margin-inline:3px}',
      'a{margin-block:2px;margin-inline:3px}',
      modern
    )
  );

  test(
    'keeps a physical shorthand that only one flow-relative axis follows because the other axis still shows it',
    passthroughCSS('a{margin:1px;margin-block:2px}', modern)
  );

  test(
    'keeps a physical shorthand before flow-relative ones for a target that ignores them, where it is the fallback',
    passthroughCSS('a{margin:1px;margin-block:2px;margin-inline:3px}', legacy)
  );

  test(
    'drops a physical longhand covered by the flow-relative longhands of both axes only when all four follow',
    processCSS(
      'a{margin-top:1px;margin-block-start:2px;margin-block-end:2px;margin-inline-start:2px;margin-inline-end:2px}',
      'a{margin-block:2px;margin-inline:2px}',
      modern
    )
  );

  test(
    'keeps a physical longhand that only three flow-relative longhands follow, because the fourth edge may land on its side',
    processCSS(
      'a{margin-top:1px;margin-block-start:2px;margin-block-end:2px;margin-inline-start:2px}',
      'a{margin-top:1px;margin-block:2px;margin-inline-start:2px}',
      modern
    )
  );

  test(
    'keeps a physical declaration that flow-relative ones with newer syntax follow, because it is their fallback',
    processCSS(
      'a{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px;margin-block:1dvh;margin-inline:1dvh}',
      'a{margin:1px;margin-block:1dvh;margin-inline:1dvh}',
      { overrideBrowserslist: ['chrome 100'] }
    )
  );
});

describe('the all shorthand', () => {
  test(
    'does not compare declarations before and after all, because all resets them in between',
    passthroughCSS('a{margin-inline-start:1px;all:unset;margin:2px}', modern)
  );

  test(
    'compares declarations after all with each other',
    processCSS(
      'a{all:unset;margin-inline-start:1px;margin:2px}',
      'a{all:unset;margin:2px}',
      modern
    )
  );
});

describe('writing mode declarations in the same rule', () => {
  test(
    'does not let writing-mode enable a fold across a physical declaration, because a more specific rule may override it',
    passthroughCSS(
      'a{writing-mode:horizontal-tb;margin-block-start:1px;margin-top:2px}',
      modern
    )
  );

  test(
    'does not let direction enable a drop, because a more specific rule may override it',
    passthroughCSS(
      'a{direction:ltr;margin-inline-start:1px;margin-left:2px}',
      modern
    )
  );

  test(
    'does not let vertical-rl enable a physical fold across the block axis',
    passthroughCSS(
      'a{writing-mode:vertical-rl;margin-top:1px;margin-right:2px;margin-block-start:7px;margin-bottom:3px;margin-left:4px}',
      modern
    )
  );
});
