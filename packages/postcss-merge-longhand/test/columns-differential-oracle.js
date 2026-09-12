import { test, suite } from 'node:test';
import { assertCascadePreserved } from '../script/lib/columnsCascadeOracle.js';

suite(
  'computed-state oracle: structured interleavings and importance lanes',
  () => {
    test('preserves computed state across width-first and count-first longhand pairs', () => {
      assertCascadePreserved('h1{column-width:10px;column-count:2}');
      assertCascadePreserved('h1{column-count:2;column-width:10px}');
    });

    test('preserves computed state when shorthand overrides earlier longhands', () => {
      assertCascadePreserved('h1{column-width:10px;columns:20px 3}');
      assertCascadePreserved('h1{column-count:2;columns:20px 3}');
      assertCascadePreserved(
        'h1{column-width:10px;column-count:2;columns:20px 3}'
      );
    });

    test('preserves computed state when later longhands override earlier shorthand components', () => {
      assertCascadePreserved('h1{columns:10px 2;column-width:20px}');
      assertCascadePreserved('h1{columns:10px 2;column-count:4}');
      assertCascadePreserved(
        'h1{columns:10px 2;column-width:20px;column-count:4}'
      );
    });

    test('preserves computed state when shorthand overrides earlier shorthand', () => {
      assertCascadePreserved('h1{columns:10px 2;columns:30px 5}');
    });

    test('preserves computed state across shorthand normalization dropping initial auto', () => {
      assertCascadePreserved('h1{columns:auto 2}');
      assertCascadePreserved('h1{columns:10px auto}');
      assertCascadePreserved('h1{columns:auto auto}');
    });

    test('preserves computed state for separate importance lanes without cross-merging', () => {
      assertCascadePreserved(
        'h1{column-width:10px;column-count:2 !important;column-width:20px !important}'
      );
      assertCascadePreserved(
        'h1{column-width:10px;column-count:2;column-width:20px !important;column-count:4 !important}'
      );
      assertCascadePreserved(
        'h1{column-width:10px;column-count:2;column-count:4 !important}'
      );
      assertCascadePreserved(
        'h1{column-width:10px;column-width:20px !important;column-count:4 !important}'
      );
    });
  }
);

suite('computed-state oracle: CSS-wide keywords', () => {
  test('merges identical CSS-wide keyword pairs into single shorthand keyword', () => {
    assertCascadePreserved('h1{column-width:inherit;column-count:inherit}');
    assertCascadePreserved('h1{column-width:initial;column-count:initial}');
    assertCascadePreserved('h1{column-width:unset;column-count:unset}');
    assertCascadePreserved('h1{column-width:revert;column-count:revert}');
    assertCascadePreserved(
      'h1{column-width:revert-layer;column-count:revert-layer}'
    );
  });

  test('refuses merge when components use different CSS-wide keywords', () => {
    assertCascadePreserved('h1{column-width:inherit;column-count:unset}');
    assertCascadePreserved('h1{column-width:revert;column-count:revert-layer}');
    assertCascadePreserved('h1{column-width:initial;column-count:revert}');
  });

  test('refuses merge when only one component is a CSS-wide keyword', () => {
    assertCascadePreserved('h1{column-width:inherit;column-count:3}');
    assertCascadePreserved('h1{column-width:10px;column-count:unset}');
    assertCascadePreserved('h1{column-width:revert;column-count:4}');
    assertCascadePreserved('h1{column-width:20px;column-count:revert-layer}');
  });

  test('preserves computed state when shorthand with CSS-wide keyword overrides longhands', () => {
    assertCascadePreserved(
      'h1{column-width:10px;column-count:2;columns:revert}'
    );
    assertCascadePreserved('h1{columns:unset;column-width:20px}');
    assertCascadePreserved('h1{columns:revert-layer;column-count:3}');
  });
});

suite('computed-state oracle: support-dependent values and fallbacks', () => {
  test('preserves fallback when one longhand introduces unsupported env()', () => {
    assertCascadePreserved(
      'h1{column-width:12em;column-width:env(col-w);column-count:3}'
    );
  });

  test('preserves fallback when longhand introduces unsupported var()', () => {
    assertCascadePreserved(
      'h1{column-width:12em;column-width:var(--w);column-count:3}'
    );
  });

  test('merges when both components share identical env() support requirements', () => {
    assertCascadePreserved(
      'h1{column-width:env(col-w);column-count:env(col-c)}'
    );
  });

  test('preserves calc fallback while companion count is present', () => {
    assertCascadePreserved(
      'h1{column-width:10px;column-width:calc(5px + 5px);column-count:2}'
    );
  });

  test('refuses invalid declarations without disturbing valid companions', () => {
    assertCascadePreserved('h1{column-width:10px;column-count:0}');
    assertCascadePreserved('h1{column-width:-10px;column-count:2}');
    assertCascadePreserved('h1{column-width:12em;column-count:2.5}');
  });
});

suite(
  'retention-heavy cases: duplicate cleanup and fallback preservation',
  () => {
    test('cleans up redundant duplicate longhands without fallbacks', () => {
      assertCascadePreserved(
        'h1{column-width:10px;column-width:20px;column-width:30px;column-count:2}'
      );
      assertCascadePreserved(
        'h1{column-width:10px;column-width:10px;column-count:2;column-count:2}'
      );
      assertCascadePreserved(
        'h1{column-count:1;column-count:2;column-count:3;column-width:15px}'
      );
    });

    test('preserves multi-step fallback ladders while merging companions', () => {
      assertCascadePreserved(
        'h1{column-width:10px;column-width:calc(5px + 5px);column-width:env(col-w);column-count:3}'
      );
      assertCascadePreserved(
        'h1{column-width:10px;column-width:env(col-w);column-count:2;column-count:env(col-c)}'
      );
      assertCascadePreserved(
        'h1{column-width:10px;column-count:2;column-width:var(--w);column-count:var(--c)}'
      );
    });

    test('handles retention and cleanup in mixed importance lanes', () => {
      assertCascadePreserved(
        'h1{column-width:10px;column-width:20px;column-count:2;column-width:30px !important;column-width:40px !important;column-count:4 !important}'
      );
      assertCascadePreserved(
        'h1{column-width:10px;column-width:env(col-w);column-width:20px !important;column-width:env(col-w2) !important}'
      );
    });

    test('cleans up earlier longhands superseded by overriding shorthand', () => {
      assertCascadePreserved(
        'h1{column-width:10px;column-width:20px;column-count:2;columns:40px 4}'
      );
      assertCascadePreserved(
        'h1{column-width:10px;column-width:20px;columns:40px 4;column-width:50px}'
      );
    });
  }
);
