import { describe, test } from 'node:test';

import { processCSSFactory } from '../../../util/testHelpers.js';

import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

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

describe('Preserved comment byte fidelity', () => {
  test(
    'should keep preserved comments byte-exact in selectors',
    passthroughCSS('.a /*! keep   multiple   spaces */ .b{color:red}')
  );

  test(
    'should keep preserved comments byte-exact in at-rule params',
    processCSS(
      '@media/*! keep   spaces */ screen{a{color:red}}',
      '@media /*! keep   spaces */ screen{a{color:red}}'
    )
  );

  test(
    'should keep preserved comments byte-exact in declaration values',
    passthroughCSS('a{color:red /*! keep   multiple   spaces */ blue}')
  );

  test(
    'should keep an unclosed comment to the end of input without fabricating a closer',
    processCSSFactory([
      injectAstNode('Declaration', 'value', 'red/*!comment'),
      plugin,
    ]).processCSS('a{color:red}', 'a{color:red/*!comment}')
  );

  test(
    'should keep an unclosed comment in a selector to the end of input without fabricating a closer',
    processCSSFactory([
      injectAstNode('Rule', 'selector', 'h1/*!comment'),
      plugin,
    ]).processCSS('h2{color:red}', 'h1/*!comment{color:red}')
  );

  test(
    'should keep an unclosed comment in at-rule params to the end of input without fabricating a closer',
    processCSSFactory([
      injectAstNode(
        'AtRule',
        'params',
        'screen and (min-width:900px)/*!comment'
      ),
      plugin,
    ]).processCSS(
      '@media all{a{color:red}}',
      '@media screen and (min-width:900px)/*!comment{a{color:red}}'
    )
  );
});
