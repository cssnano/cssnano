import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { decl } from 'postcss';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';
import {
  alignmentFamilies,
  parseAlignmentDeclaration,
} from '../src/lib/decl/alignmentForms.js';

// Targets that all support place-*, so only the alignment grammar decides.
const { passthroughCSS, processCSS } = processCSSFactory([
  plugin({ overrideBrowserslist: 'chrome 120, firefox 120, safari 17' }),
]);

describe('box alignment merging fail-closed contracts', () => {
  describe('keyword fallbacks and vendor aliases', () => {
    test(
      'does not merge a longhand with an escaped keyword because the family parser does not decode keywords',
      passthroughCSS('a{align-items:\\63 enter;justify-items:start}')
    );

    test(
      'does not merge a repeated justify-content because the first keyword is a fallback for browsers without space-evenly',
      passthroughCSS(
        'a{justify-content:space-between;justify-content:space-evenly;align-content:center}'
      )
    );

    test(
      'does not merge a repeated align-items because the first keyword is a fallback for browsers without overflow-position keywords',
      passthroughCSS(
        'a{align-items:center;align-items:safe center;justify-items:center}'
      )
    );

    test(
      'does not merge a repeated justify-items placed before its align-items counterpart',
      passthroughCSS(
        'a{justify-items:start;justify-items:legacy center;align-items:center}'
      )
    );

    test(
      'does not merge when a vendor-prefixed alias of a family longhand sits after the longhand, because the alias would win in engines that treat it as the same property',
      passthroughCSS(
        'a{justify-content:center;-webkit-justify-content:flex-end;align-content:center}'
      )
    );

    test(
      'does not merge when an -o- prefixed alias sits between the two longhands, because any vendor prefix may name the same property',
      passthroughCSS(
        'a{align-items:center;-o-align-items:flex-end;justify-items:center}'
      )
    );

    test(
      'does not merge when a vendor-prefixed alias sits between the two longhands',
      passthroughCSS(
        'a{align-items:center;-webkit-align-items:flex-end;justify-items:center}'
      )
    );

    test(
      'does not merge when a vendor-prefixed alias precedes the longhands',
      passthroughCSS(
        'a{-webkit-align-self:flex-end;align-self:center;justify-self:center}'
      )
    );

    test(
      'does not merge when an escaped spelling of a family longhand sits between the longhands, because engines decode it to the same property',
      passthroughCSS(
        'a{align-items:center;align-it\\65ms:start;justify-items:center}'
      )
    );

    test(
      'merges a family around a custom property, because it never shadows an alignment property',
      processCSS(
        'a{align-items:center;--align-items:end;justify-items:center}',
        'a{--align-items:end;place-items:center}'
      )
    );

    test(
      'merges a family around an escaped name that is not a single identifier, because it names no alignment property',
      processCSS(
        'a{align-items:center;1\\61:1;justify-items:center}',
        'a{1\\61:1;place-items:center}'
      )
    );

    test(
      'still merges a family when the vendor-prefixed alias belongs to a different family',
      processCSS(
        'a{-webkit-align-items:center;align-content:center;justify-content:center}',
        'a{-webkit-align-items:center;place-content:center}'
      )
    );
  });

  describe('partly supported keywords keep their axes independent', () => {
    // A browser rejects a whole place-* declaration for one unknown keyword,
    // but as longhands it drops only the axis it does not understand.
    for (const [name, css] of [
      ['anchor-center', 'a{align-self:center;justify-self:anchor-center}'],
      ['safe', 'a{align-items:safe center;justify-items:end}'],
      ['unsafe', 'a{align-content:center;justify-content:unsafe start}'],
      ['last baseline', 'a{align-self:last baseline;justify-self:center}'],
      ['left', 'a{align-items:center;justify-items:left}'],
      ['right', 'a{align-self:center;justify-self:right}'],
      ['legacy', 'a{align-items:center;justify-items:legacy center}'],
    ]) {
      test(
        `does not merge differing axes when one uses ${name}, because an engine that lacks it would drop both`,
        passthroughCSS(css)
      );
    }

    test(
      'does not merge safe normal with safe center, because an engine that supports safe but not the pair would drop only align-self as a longhand but both axes as place-self',
      passthroughCSS('a{align-self:safe normal;justify-self:safe center}')
    );

    test(
      'does not merge unsafe center with unsafe normal, because the normal pair is a separate feature from unsafe',
      passthroughCSS('a{align-self:unsafe center;justify-self:unsafe normal}')
    );

    test(
      'does not merge a place-items shorthand with a following longhand using safe, because the shorthand is then a fallback',
      passthroughCSS('a{place-items:center;align-items:safe center}')
    );

    test(
      'does not merge a place-self shorthand whose anchor-center axis a longhand overrides, because an engine without anchor-center ignores the shorthand and keeps justify-self at its initial value',
      passthroughCSS('a{place-self:anchor-center center;align-self:start}')
    );

    test(
      'does not merge a place-items shorthand whose safe axis a longhand overrides, because an engine without safe ignores the shorthand and keeps justify-items at its initial value',
      passthroughCSS('a{place-items:safe center end;align-items:start}')
    );

    test(
      'merges differing axes that both use safe, because an engine without safe drops both longhands and the shorthand alike',
      processCSS(
        'a{align-items:safe center;justify-items:safe start}',
        'a{place-items:safe center safe start}'
      )
    );
  });

  describe('existing place-* shorthands and surrounding declarations', () => {
    test(
      'reduces an escaped identifier in a lone place-items shorthand',
      processCSS(
        'a{place-items:\\63 enter center}',
        'a{place-items:\\63 enter}'
      )
    );

    test(
      'merges longhands whose values contain a comment',
      processCSS(
        'a{align-items:/**/center;justify-items:center}',
        'a{place-items:center}'
      )
    );

    test(
      'merges alignment longhands alongside other reducers in one rule',
      processCSS(
        'a{margin-top:1px;margin-right:1px;margin-bottom:1px;margin-left:1px;align-items:center;justify-items:center}',
        'a{margin:1px;place-items:center}'
      )
    );

    test(
      'merges alignment longhands inside an at-rule',
      processCSS(
        '@media screen{a{align-items:start;justify-items:end}}',
        '@media screen{a{place-items:start end}}'
      )
    );

    test(
      'leaves a rule with one alignment longhand and an unrelated declaration unchanged, because the other axis would be set to its initial value by a shorthand',
      passthroughCSS('a{align-items:center;color:red}')
    );
  });

  describe('values a browser ignores leave every declaration untouched', () => {
    for (const [name, css] of [
      [
        'an unknown keyword in a shorthand',
        'a{place-items:foo;align-items:center}',
      ],
      [
        'a shorthand with five components',
        'a{place-items:a b c d e;align-items:center}',
      ],
      [
        'a comma in a shorthand',
        'a{place-items:center,start;align-items:center}',
      ],
      [
        'a comment inside a shorthand',
        'a{place-items:safe/**/center;align-items:center}',
      ],
      [
        'a shorthand with no valid axis split',
        'a{place-items:start end center;align-items:center}',
      ],
      ['an empty shorthand', 'a{place-items:;align-items:center}'],
      [
        'a longhand with three components',
        'a{align-items:safe center start;justify-items:center}',
      ],
      [
        'a comma in a longhand',
        'a{align-items:center,start;justify-items:center}',
      ],
      [
        'a comment inside a longhand',
        'a{align-items:safe/**/center;justify-items:center}',
      ],
      [
        'an unknown two-component longhand',
        'a{align-items:foo bar;justify-items:center}',
      ],
      ['an empty longhand', 'a{align-items:;justify-items:center}'],
    ]) {
      test(
        `does not merge ${name}, because the browser ignores that declaration`,
        passthroughCSS(css)
      );
    }

    test('parses no slots for a property outside the family', () => {
      assert.equal(
        parseAlignmentDeclaration(
          alignmentFamilies['place-items'],
          decl({ prop: 'align-content', value: 'center' })
        ),
        null
      );
    });
  });

  describe('existing two-value shorthands combined with a longhand', () => {
    test(
      'overrides one axis of an asymmetric place-items shorthand with a longhand',
      processCSS(
        'a{place-items:start end;align-items:center}',
        'a{place-items:center end}'
      )
    );

    test(
      'does not override one axis of a symmetric safe place-items shorthand, because the merged shorthand would depend on safe support for both axes',
      passthroughCSS('a{place-items:safe center;justify-items:center}')
    );
  });
});
