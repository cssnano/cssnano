import { describe, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

// Targets that all support place-*, so only the alignment grammar decides.
const { passthroughCSS, processCSS } = processCSSFactory([
  plugin({ overrideBrowserslist: 'chrome 120, firefox 120, safari 17' }),
]);

describe('paired box alignment shorthand merging', () => {
  describe('symmetric value collapsing', () => {
    test(
      'collapses identical align-items and justify-items keywords to single-value place-items',
      processCSS(
        'a{align-items:center;justify-items:center}',
        'a{place-items:center}'
      )
    );

    test(
      'collapses identical case-insensitive alignment keywords',
      processCSS(
        'a{ALIGN-ITEMS:center;JUSTIFY-ITEMS:CENTER}',
        'a{place-items:center}'
      )
    );

    test(
      'collapses identical align-content and justify-content keywords to single-value place-content',
      processCSS(
        'a{align-content:space-between;justify-content:space-between}',
        'a{place-content:space-between}'
      )
    );

    test(
      'collapses identical align-self and justify-self keywords to single-value place-self',
      processCSS(
        'a{align-self:stretch;justify-self:stretch}',
        'a{place-self:stretch}'
      )
    );

    test(
      'collapses identical auto keywords for place-self',
      processCSS('a{align-self:auto;justify-self:auto}', 'a{place-self:auto}')
    );

    test(
      'collapses identical anchor-center keywords for place-self',
      processCSS(
        'a{align-self:anchor-center;justify-self:anchor-center}',
        'a{place-self:anchor-center}'
      )
    );

    test(
      'collapses identical multi-token overflow-position values for place-items',
      processCSS(
        'a{align-items:safe center;justify-items:safe center}',
        'a{place-items:safe center}'
      )
    );

    test(
      'collapses identical multi-token baseline-position values for place-self',
      processCSS(
        'a{align-self:first baseline;justify-self:first baseline}',
        'a{place-self:first baseline}'
      )
    );

    test(
      'collapses identical multi-token keywords with internal whitespace differences',
      processCSS(
        'a{align-items:safe  center;justify-items:safe   center}',
        'a{place-items:safe center}'
      )
    );

    test(
      'does not merge the reversed baseline order, because Blink and Gecko accept only the first|last baseline order and would drop the whole shorthand',
      passthroughCSS('a{align-self:baseline first;justify-self:center}')
    );

    test(
      'reads place-items:baseline first baseline as baseline | first baseline, the only split of first|last baseline forms',
      processCSS(
        'a{place-items:baseline first baseline;justify-items:end}',
        'a{place-items:baseline end}'
      )
    );

    test(
      'drops a full shorthand that global keyword longhands on both axes override',
      processCSS(
        'a{place-self:start end;align-self:inherit;justify-self:inherit}',
        'a{place-self:inherit}'
      )
    );
  });

  describe('asymmetric value merging', () => {
    test(
      'merges distinct align-items and justify-items values into two-value place-items',
      processCSS(
        'a{align-items:start;justify-items:end}',
        'a{place-items:start end}'
      )
    );

    test(
      'merges distinct align-content and justify-content values into two-value place-content',
      processCSS(
        'a{align-content:center;justify-content:space-between}',
        'a{place-content:center space-between}'
      )
    );

    test(
      'merges distinct align-self and justify-self values into two-value place-self',
      processCSS(
        'a{align-self:flex-start;justify-self:flex-end}',
        'a{place-self:flex-start flex-end}'
      )
    );

    test(
      'merges baseline align-content with valid justify-content into two-value place-content',
      processCSS(
        'a{align-content:baseline;justify-content:center}',
        'a{place-content:baseline center}'
      )
    );

    test(
      'merges two widely supported keywords that differ per axis',
      processCSS(
        'a{align-items:center;justify-items:end}',
        'a{place-items:center end}'
      )
    );
  });

  describe('specification restrictions and asymmetric value protection', () => {
    test(
      'does not collapse or merge align-content and justify-content when both are baseline because justify-content rejects baseline per spec',
      passthroughCSS('a{align-content:baseline;justify-content:baseline}')
    );

    test(
      'does not collapse or merge align-content and justify-content when both are first baseline because justify-content rejects baseline per spec',
      passthroughCSS(
        'a{align-content:first baseline;justify-content:first baseline}'
      )
    );
  });

  describe('fail-closed contracts on lone, invalid, or custom declarations', () => {
    test(
      'does not synthesize place-items from lone align-items because omitting justify-items would alter grid layout defaults',
      passthroughCSS('a{align-items:center}')
    );

    test(
      'does not synthesize place-items from lone justify-items because omitting align-items would alter layout defaults',
      passthroughCSS('a{justify-items:center}')
    );

    test(
      'does not synthesize place-content from lone align-content',
      passthroughCSS('a{align-content:center}')
    );

    test(
      'does not synthesize place-self from lone justify-self',
      passthroughCSS('a{justify-self:auto}')
    );

    test(
      'does not merge auto for place-items because auto is invalid for align-items and justify-items',
      passthroughCSS('a{align-items:auto;justify-items:auto}')
    );

    test(
      'does not merge auto for place-content because auto is invalid for align-content and justify-content',
      passthroughCSS('a{align-content:auto;justify-content:auto}')
    );

    test(
      'does not merge dimension values because alignment properties accept only keyword formulas',
      passthroughCSS('a{align-items:10px;justify-items:center}')
    );

    test(
      'does not merge when a longhand contains a custom property because var() evaluation cannot be statically proven safe',
      passthroughCSS('a{align-items:var(--custom);justify-items:center}')
    );

    test(
      'does not merge when a longhand contains a custom property in the second slot',
      passthroughCSS('a{align-items:center;justify-items:var(--custom)}')
    );
  });

  describe('cascade, importance lanes, and reset boundaries', () => {
    test(
      'merges declarations sharing the important lane into an important shorthand',
      processCSS(
        'a{align-items:center!important;justify-items:center!important}',
        'a{place-items:center!important}'
      )
    );

    test(
      'does not merge across different importance lanes to preserve cascade precedence',
      passthroughCSS('a{align-items:center!important;justify-items:center}')
    );

    test(
      'does not merge across opposite importance lanes',
      passthroughCSS('a{align-items:center;justify-items:center!important}')
    );

    test(
      'does not merge across an intervening all reset',
      passthroughCSS('a{align-items:center;all:initial;justify-items:center}')
    );

    test(
      'merges complete alignment pairs independently on both sides of an all reset',
      processCSS(
        'a{align-items:center;justify-items:center;all:initial;align-items:start;justify-items:end}',
        'a{place-items:center;all:initial;place-items:start end}'
      )
    );

    test(
      'merges identical CSS global keywords into a single global keyword shorthand',
      processCSS(
        'a{align-items:inherit;justify-items:inherit}',
        'a{place-items:inherit}'
      )
    );

    test(
      'does not merge conflicting CSS global keywords, because a shorthand cannot hold two different CSS-wide keywords',
      passthroughCSS('a{align-items:inherit;justify-items:initial}')
    );

    test(
      'does not merge a CSS global keyword with a concrete alignment keyword, because a CSS-wide keyword is valid only as the whole shorthand value',
      passthroughCSS('a{align-items:inherit;justify-items:center}')
    );

    test(
      'does not merge declarations containing browser stylehacks to preserve hack isolation',
      passthroughCSS('a{align-items:center\\9;justify-items:center}')
    );

    test(
      'does not merge declarations with vendor-prefixed legacy values to preserve legacy browser fallbacks',
      passthroughCSS(
        'a{align-items:-webkit-flex-start;align-items:start;justify-items:end}'
      )
    );
  });

  describe('shorthand interaction and overrides', () => {
    test(
      'merges a preceding place-items shorthand with a subsequent longhand override',
      processCSS(
        'a{place-items:start;align-items:center}',
        'a{place-items:center start}'
      )
    );

    test(
      'allows a subsequent place-items shorthand to override preceding longhands',
      processCSS(
        'a{align-items:start;justify-items:end;place-items:center}',
        'a{place-items:center}'
      )
    );

    test(
      'normalizes existing redundant two-value shorthand declarations alongside longhand merges',
      processCSS(
        'a{place-items:center center;align-self:center;justify-self:center}',
        'a{place-items:center;place-self:center}'
      )
    );

    test(
      'normalizes a lone two-value shorthand with irregular internal whitespace',
      processCSS(
        'a{place-items:safe   center safe   center}',
        'a{place-items:safe center}'
      )
    );
  });
});
