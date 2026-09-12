import { test, suite } from 'node:test';
import pluginFactory from '../src/index.js';
import { processCSSFactory } from '../../../util/testHelpers.js';

const { processCSS, passthroughCSS } = processCSSFactory(pluginFactory);

/*
 * Negative-path routing tests. The plugin now normalizes a rule whose only
 * border declaration is a standalone shorthand directly, instead of cloning
 * the rule and running explode/merge; and `borders.merge` only invokes each
 * pass when its required property shapes exist. These tests pin every one of
 * those routing decisions to independently specified output contracts.
 */

suite('single standalone shorthand normalization', () => {
  test(
    'normalizes a lone border shorthand',
    processCSS('h1{border:1PX solid RED}', 'h1{border:1px solid red}')
  );
  test(
    'lower-cases the border property',
    processCSS('h1{BORDER:1PX solid red}', 'h1{border:1px solid red}')
  );
  test(
    'minimizes default border values',
    processCSS('h1{border:medium none currentcolor}', 'h1{border:none}')
  );
  test(
    'keeps values rewrite() would have reverted',
    passthroughCSS('h1{border:1px solid var(--x)}')
  );
  test('keeps invalid border values', passthroughCSS('h1{border:1px 2px}'));
  test(
    'keeps single longhands untouched',
    passthroughCSS('h1{border-top-width:1PX}')
  );
  test(
    'keeps the casing of a single physical longhand',
    passthroughCSS('h1{BORDER-TOP-WIDTH:1PX}')
  );

  test(
    'normalizes a lone side shorthand',
    processCSS('h1{border-top:1PX solid red}', 'h1{border-top:1px solid red}')
  );
  test(
    'collapses a lone component shorthand',
    processCSS('h1{border-width:1px 2px 1px 2px}', 'h1{border-width:1px 2px}')
  );
  test(
    'lower-cases a lone component shorthand property, keeping value case',
    processCSS('h1{BORDER-WIDTH:1PX 2PX}', 'h1{border-width:1PX 2PX}')
  );
  test(
    'preserves the case of a lone border-color value',
    processCSS('h1{border-color:RED red}', 'h1{border-color:RED red}')
  );
  test(
    'keeps a lone none border',
    processCSS('h1{border:none}', 'h1{border:none}')
  );
  test(
    'preserves a lone functional border color',
    processCSS(
      'h1{border:1px solid rgba(0,0,0,.5)}',
      'h1{border:1px solid rgba(0,0,0,.5)}'
    )
  );
  test(
    'normalizes known terms around a lone calc border width',
    processCSS(
      'h1{border:calc(1PX + 1PX) solid RED}',
      'h1{border:calc(1px + 1px) solid red}'
    )
  );

  test(
    'collapses a lone border-spacing property',
    processCSS('h1{border-spacing:1px 1px}', 'h1{border-spacing:1px}')
  );
  test(
    'keeps border-spacing property case',
    processCSS('h1{BORDER-SPACING:1px 1px}', 'h1{BORDER-SPACING:1px}')
  );
  test(
    'passes through invalid border-spacing with three equal values',
    passthroughCSS('h1{border-spacing:1px 1px 1px}')
  );
  test(
    'passes through invalid border-spacing with three mixed values',
    passthroughCSS('h1{border-spacing:1px 1px 2px}')
  );
  test(
    'rejects negative border-spacing lengths',
    passthroughCSS('h1{border-spacing:-1px -1px}')
  );
  test(
    'rejects percentage border-spacing values',
    passthroughCSS('h1{border-spacing:10% 10%}')
  );
  test(
    'rejects malformed border-spacing functions',
    passthroughCSS('h1{border-spacing:calc(1px,) calc(1px,)}')
  );
  test(
    'rejects unknown border-spacing functions',
    passthroughCSS('h1{border-spacing:unknown(1px) unknown(1px)}')
  );

  test(
    'normalizes a lone margin shorthand',
    processCSS('h1{MARGIN:10px 10px 10px 10px}', 'h1{margin:10px}')
  );
  test('keeps margin value case', passthroughCSS('h1{margin:1PX 2PX}'));
  test(
    'keeps margin values with var()',
    passthroughCSS('h1{margin:1px var(--x)}')
  );
  test(
    'keeps invalid margin values',
    passthroughCSS('h1{margin:1px 2px 3px 4px 5px}')
  );
  test(
    'keeps margin values the grammar does not hold',
    passthroughCSS('h1{margin:dotted none}')
  );

  test(
    'normalizes a lone padding shorthand',
    processCSS('h1{padding:1px 1px 1px 1px}', 'h1{padding:1px}')
  );
  test(
    'keeps padding calc values',
    passthroughCSS('h1{padding:calc(1PX + 1PX)}')
  );

  test(
    'handles each family of a mixed rule independently',
    processCSS(
      'h1{BORDER:1PX solid RED;margin:1px 2px 3px 4px}',
      'h1{border:1px solid red;margin:1px 2px 3px 4px}'
    )
  );

  test(
    'normalizes an important border declaration',
    processCSS(
      'h1{BORDER:1PX solid red!important}',
      'h1{border:1px solid red!important}'
    )
  );
});

suite('per-pass routing predicates', () => {
  test(
    'a side with one missing longhand cannot merge',
    passthroughCSS('h1{border-top-width:1px;border-top-style:solid;color:red}')
  );

  test(
    'an importance partition blocks the side merge',
    passthroughCSS(
      'h1{border-top-width:1px!important;border-top-style:solid;border-top-color:red}'
    )
  );

  test(
    'an importance-uniform side still merges',
    processCSS(
      'h1{border-top-width:1px!important;border-top-style:solid!important;border-top-color:red!important}',
      'h1{border-top:1px solid red!important}'
    )
  );

  test(
    'a lone component shorthand with no siblings stays',
    passthroughCSS('h1{border-width:1px;color:red}')
  );

  test(
    'virtual shorthand expansion fuels the component merge',
    processCSS(
      'h1{border:1PX solid red;border-left-width:1px}',
      'h1{border:1px solid red}'
    )
  );

  test(
    'cleanup-only rules pass through unchanged',
    passthroughCSS(
      'h1{border-top-width:1px;border-top-style:solid;border-bottom-width:2px;border-bottom-style:dashed}'
    )
  );

  test(
    'a rule needing rewrite still merges leaves into a component',
    processCSS(
      'h1{border-top-width:1px;border-right-width:1px;border-bottom-width:1px;border-left-width:1px}',
      'h1{border-width:1px}'
    )
  );

  test(
    'reverting rules stay byte-identical',
    passthroughCSS('h1{border:1px solid red;border-top:2px dashed blue}')
  );
});
