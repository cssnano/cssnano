import { describe, test } from 'node:test';
import {
  processCSSFactory,
  withTargets,
} from '../../../../../../../util/testHelpers.js';
import { transformPlugin } from '#passes/merge';
const plugin = transformPlugin('mergeLonghand');

// Safari parses the shorthand's style, color and thickness components from 26.2.
const { passthroughCSS, processCSS } = processCSSFactory([
  plugin(withTargets('chrome 120, firefox 120, safari 26.2')),
]);

describe('text-decoration longhand merging', () => {
  test(
    'merges line, style, color and thickness in grammar order',
    processCSS(
      'a{text-decoration-thickness:2px;text-decoration-color:red;text-decoration-style:wavy;text-decoration-line:underline}',
      'a{text-decoration:underline wavy red 2px}'
    )
  );

  test(
    'omits every initial component, which leaves none',
    processCSS(
      'a{text-decoration-line:none;text-decoration-style:solid;text-decoration-color:currentcolor;text-decoration-thickness:auto}',
      'a{text-decoration:none}'
    )
  );

  test(
    'keeps only the line when the other components are initial',
    processCSS(
      'a{text-decoration-line:underline;text-decoration-style:solid;text-decoration-color:currentcolor;text-decoration-thickness:auto}',
      'a{text-decoration:underline}'
    )
  );

  test(
    'keeps several line keywords in the order written',
    processCSS(
      'a{text-decoration-line:underline overline;text-decoration-style:solid;text-decoration-color:currentcolor;text-decoration-thickness:auto}',
      'a{text-decoration:underline overline}'
    )
  );

  test(
    'keeps only the style when the line is none, which the style then does not change',
    processCSS(
      'a{text-decoration-line:none;text-decoration-style:dotted;text-decoration-color:currentcolor;text-decoration-thickness:auto}',
      'a{text-decoration:dotted}'
    )
  );

  test(
    'merges the from-font thickness keyword',
    processCSS(
      'a{text-decoration-line:underline;text-decoration-style:solid;text-decoration-color:currentcolor;text-decoration-thickness:from-font}',
      'a{text-decoration:underline from-font}'
    )
  );

  test(
    'merges a lone length as the thickness, which the shorthand accepts',
    processCSS(
      'a{text-decoration-line:none;text-decoration-style:solid;text-decoration-color:currentcolor;text-decoration-thickness:2px}',
      'a{text-decoration:2px}'
    )
  );

  test(
    'keeps a unitless thickness as written, because only zero may be unitless',
    passthroughCSS(
      'a{text-decoration-line:underline;text-decoration-style:solid;text-decoration-color:currentcolor;text-decoration-thickness:2}'
    )
  );

  test(
    'keeps a negative thickness as written because the grammar forbids it',
    passthroughCSS(
      'a{text-decoration-line:underline;text-decoration-style:solid;text-decoration-color:currentcolor;text-decoration-thickness:-1px}'
    )
  );

  test(
    'keeps a spelling-error line as written, which the merge does not read',
    passthroughCSS(
      'a{text-decoration-line:spelling-error;text-decoration-style:solid;text-decoration-color:currentcolor;text-decoration-thickness:auto}'
    )
  );

  test(
    'keeps a repeated line keyword as written, because the grammar allows each keyword once',
    passthroughCSS(
      'a{text-decoration-line:underline underline;text-decoration-style:solid;text-decoration-color:currentcolor;text-decoration-thickness:auto}'
    )
  );

  test(
    'keeps none beside a line keyword as written, because none is the whole line',
    passthroughCSS(
      'a{text-decoration-line:none underline;text-decoration-style:solid;text-decoration-color:currentcolor;text-decoration-thickness:auto}'
    )
  );

  test(
    'keeps the longhands in a target that predates the shorthand, because the family has no support there',
    processCSSFactory([plugin(withTargets('chrome 86'))]).passthroughCSS(
      'a{text-decoration-line:underline;text-decoration-style:solid;text-decoration-color:currentcolor;text-decoration-thickness:2px}'
    )
  );

  test(
    'merges equal CSS-wide keywords',
    processCSS(
      'a{text-decoration-line:inherit;text-decoration-style:inherit;text-decoration-color:inherit;text-decoration-thickness:inherit}',
      'a{text-decoration:inherit}'
    )
  );

  test(
    'keeps mixed CSS-wide keywords because a shorthand takes one for all',
    passthroughCSS(
      'a{text-decoration-line:inherit;text-decoration-style:solid;text-decoration-color:currentcolor;text-decoration-thickness:auto}'
    )
  );

  test(
    'keeps the longhands when a text-decoration shorthand that resets them is present',
    passthroughCSS(
      'a{text-decoration-line:underline;text-decoration-style:solid;text-decoration-color:currentcolor;text-decoration-thickness:auto;text-decoration:none}'
    )
  );

  test(
    'keeps a style, color or thickness that Safari 17 does not parse in the shorthand, so the longhands stay',
    processCSSFactory([plugin(withTargets('safari 17'))]).passthroughCSS(
      'a{text-decoration-line:underline;text-decoration-style:wavy;text-decoration-color:currentcolor;text-decoration-thickness:auto}'
    )
  );

  test(
    'keeps a thickness that Safari 17 does not parse in the shorthand, so the longhands stay',
    processCSSFactory([plugin(withTargets('safari 17'))]).passthroughCSS(
      'a{text-decoration-line:underline;text-decoration-style:solid;text-decoration-color:currentcolor;text-decoration-thickness:2px}'
    )
  );

  test(
    'merges a line alone in Safari 17, which parses the line shorthand',
    processCSSFactory([plugin(withTargets('safari 17'))]).processCSS(
      'a{text-decoration-line:underline;text-decoration-style:solid;text-decoration-color:currentcolor;text-decoration-thickness:auto}',
      'a{text-decoration:underline}'
    )
  );

  test(
    'merges around text-decoration-skip-ink, which the shorthand does not reset',
    processCSS(
      'a{text-decoration-skip-ink:none;text-decoration-line:underline;text-decoration-style:solid;text-decoration-color:currentcolor;text-decoration-thickness:auto}',
      'a{text-decoration-skip-ink:none;text-decoration:underline}'
    )
  );
});
