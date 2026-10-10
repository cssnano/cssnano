import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

// Targets that all support the shorthands, so only the grammar decides.
const modern = processCSSFactory([
  plugin({ overrideBrowserslist: 'chrome 120, firefox 120, safari 17' }),
]);
const { passthroughCSS, processCSS } = modern;

/** @param {string} browsers */
function targeting(browsers) {
  return processCSSFactory([plugin({ overrideBrowserslist: browsers })]);
}

describe('column-rule longhand merging', () => {
  test(
    'merges width, style and color in grammar order',
    processCSS(
      'a{column-rule-color:red;column-rule-style:solid;column-rule-width:2px}',
      'a{column-rule:2px solid red}'
    )
  );

  test(
    'omits the initial medium width',
    processCSS(
      'a{column-rule-width:medium;column-rule-style:solid;column-rule-color:red}',
      'a{column-rule:solid red}'
    )
  );

  test(
    'omits the initial currentcolor',
    processCSS(
      'a{column-rule-width:1px;column-rule-style:dashed;column-rule-color:currentColor}',
      'a{column-rule:1px dashed}'
    )
  );

  test(
    'writes none when all three components are initial',
    processCSS(
      'a{column-rule-width:medium;column-rule-style:none;column-rule-color:currentcolor}',
      'a{column-rule:none}'
    )
  );

  test(
    'merges the hidden style that column-rule accepts like a border',
    processCSS(
      'a{column-rule-width:1px;column-rule-style:hidden;column-rule-color:red}',
      'a{column-rule:1px hidden red}'
    )
  );

  test(
    'merges equal CSS-wide keywords',
    processCSS(
      'a{column-rule-width:inherit;column-rule-style:inherit;column-rule-color:inherit}',
      'a{column-rule:inherit}'
    )
  );

  test(
    'keeps mixed CSS-wide keywords because a shorthand takes one for all',
    passthroughCSS(
      'a{column-rule-width:inherit;column-rule-style:solid;column-rule-color:red}'
    )
  );

  test(
    'keeps only two of the three longhands because the shorthand would reset the third',
    passthroughCSS('a{column-rule-width:1px;column-rule-style:solid}')
  );

  test(
    'keeps a value in the wrong slot because the browser ignores it',
    passthroughCSS(
      'a{column-rule-width:solid;column-rule-style:solid;column-rule-color:red}'
    )
  );

  test(
    'merges a comma-form rgb() colour because the function is one component',
    processCSS(
      'a{column-rule-width:1px;column-rule-style:solid;column-rule-color:rgb(0,0,0)}',
      'a{column-rule:1px solid rgb(0,0,0)}'
    )
  );

  test(
    'merges a space-form rgb() colour because the function is one component',
    processCSS(
      'a{column-rule-width:1px;column-rule-style:solid;column-rule-color:rgb(0 0 0 / 50%)}',
      'a{column-rule:1px solid rgb(0 0 0 / 50%)}'
    )
  );

  test(
    'keeps a negative width because the browser ignores it',
    passthroughCSS(
      'a{column-rule-width:-1px;column-rule-style:solid;column-rule-color:red}'
    )
  );

  test(
    'keeps a var() value because its type is unknown',
    passthroughCSS(
      'a{column-rule-width:var(--w);column-rule-style:solid;column-rule-color:red}'
    )
  );

  test(
    'keeps a calc() width because the value is not compared',
    passthroughCSS(
      'a{column-rule-width:calc(1px + 1px);column-rule-style:solid;column-rule-color:red}'
    )
  );

  test(
    'merges the three longhands around column-rule-inset because column-rule does not reset it',
    processCSS(
      'a{column-rule-inset:1px;column-rule-width:1px;column-rule-style:solid;column-rule-color:red}',
      'a{column-rule-inset:1px;column-rule:1px solid red}'
    )
  );

  test(
    'merges the three longhands around column-rule-break because column-rule does not reset it',
    processCSS(
      'a{column-rule-width:1px;column-rule-break:intersection;column-rule-style:solid;column-rule-color:red}',
      'a{column-rule-break:intersection;column-rule:1px solid red}'
    )
  );

  test(
    'keeps longhands beside an existing column-rule shorthand, though they could merge, because a shorthand sharing their cascade leaves the family as written',
    passthroughCSS(
      'a{column-rule:1px solid;column-rule-width:1px;column-rule-style:solid;column-rule-color:red}'
    )
  );

  test(
    'keeps longhands around a rule shorthand because rule resets the column-rule longhands',
    passthroughCSS(
      'a{column-rule-width:1px;rule:2px dotted blue;column-rule-style:solid;column-rule-color:red}'
    )
  );

  test(
    'keeps longhands around a rule-width shorthand because it resets column-rule-width',
    passthroughCSS(
      'a{column-rule-width:1px;rule-width:2px;column-rule-style:solid;column-rule-color:red}'
    )
  );

  test(
    'merges a color with alpha when every target parses the hex syntax',
    modern.processCSS(
      'a{column-rule-width:1px;column-rule-style:solid;column-rule-color:#f008}',
      'a{column-rule:1px solid #f008}'
    )
  );

  test(
    'keeps longhands when one target predates the hex color with alpha',
    targeting('chrome 120, safari 9').passthroughCSS(
      'a{column-rule-width:1px;column-rule-style:solid;column-rule-color:#f008}'
    )
  );
});
