import { describe, test } from 'node:test';

import { processCSSFactory } from '../../../util/testHelpers.js';

import plugin from '../src/index.js';

// Injects an unclosed comment into an AST node after parsing; PostCSS's own
// parser rejects unclosed comments, so only a composed pipeline can reach
// the plugin's end-of-input comment handling.
/**
 * @param {'Declaration' | 'Rule' | 'AtRule'} type
 * @param {string} prop
 * @param {string} value
 */
function injectAstNode(type, prop, value) {
  return {
    postcssPlugin: `inject-${type.toLowerCase()}-${prop}`,
    [type](node) {
      node[prop] = value;
      if (node.raws && prop in node.raws) {
        node.raws[prop] = null;
      }
    },
  };
}

describe('Unclosed comments marked for removal', () => {
  test(
    'should remove an unclosed comment from a declaration value',
    processCSSFactory([
      injectAstNode('Declaration', 'value', 'red/*comment'),
      plugin,
    ]).processCSS('a{color:blue}', 'a{color:red}')
  );

  test(
    'should remove an unclosed comment preceded by whitespace from a declaration value',
    processCSSFactory([
      injectAstNode('Declaration', 'value', 'red /*comment'),
      plugin,
    ]).processCSS('a{color:blue}', 'a{color:red}')
  );

  test(
    'should remove an unclosed comment that occupies the entire declaration value',
    processCSSFactory([
      injectAstNode('Declaration', 'value', '/*comment'),
      plugin,
    ]).processCSS('a{color:blue}', 'a{color:}')
  );

  test(
    'should remove an unclosed comment from a custom property value while preserving whitespace',
    processCSSFactory([
      injectAstNode('Declaration', 'value', '10px/*comment'),
      plugin,
    ]).processCSS('a{--gap:0}', 'a{--gap:10px }')
  );

  test(
    'should remove an unclosed comment from a selector',
    processCSSFactory([
      injectAstNode('Rule', 'selector', 'h1/*comment'),
      plugin,
    ]).processCSS('h2{color:red}', 'h1{color:red}')
  );

  test(
    'should remove an unclosed comment from at-rule params',
    processCSSFactory([
      injectAstNode(
        'AtRule',
        'params',
        'screen and (min-width:900px)/*comment'
      ),
      plugin,
    ]).processCSS(
      '@media all{a{color:red}}',
      '@media screen and (min-width:900px){a{color:red}}'
    )
  );
});
