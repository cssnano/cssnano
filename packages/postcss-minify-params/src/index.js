import browserslist from 'browserslist';
import postcss from 'postcss';
import valueParser, { stringify } from 'postcss-value-parser';
import sort from 'alphanum-sort';
import * as R from 'ramda';
import getArguments from 'lerna:cssnano-util-get-arguments';
import includedIn from './lib/includedIn';
import isFunctionNode from './lib/isFunctionNode';
import isNodeValueEqual from './lib/isNodeValueEqual';
import isSpaceNode from './lib/isSpaceNode';

/**
 * Return the greatest common divisor
 * of two numbers.
 */

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

function aspectRatio(a, b) {
  const divisor = gcd(a, b);

  return [a / divisor, b / divisor];
}

const split = R.compose(
  R.join(''),
  R.map(stringify)
);

function removeNode(node) {
  node.value = '';
  node.type = 'word';
}

const isAspectRatio = R.allPass([
  isFunctionNode,
  R.pathSatisfies(R.equals(5), ['nodes', 'length']),
  R.compose(
    R.endsWith('aspect-ratio'),
    R.toLower,
    R.path(['nodes', 0, 'value'])
  ),
]);

const isDividerNode = R.propEq('type', 'div');

const isNodeDividerOrFunction = R.either(isDividerNode, isFunctionNode);

const transform = R.curry((legacy, rule) => {
  const params = valueParser(rule.params);

  params.walk((node, index) => {
    if (isNodeDividerOrFunction(node)) {
      node.before = node.after = '';

      if (isAspectRatio(node)) {
        const [a, b] = aspectRatio(node.nodes[2].value, node.nodes[4].value);

        node.nodes[2].value = a;
        node.nodes[4].value = b;
      }
    } else if (isSpaceNode(node)) {
      node.value = ' ';
    } else {
      const prevWord = params.nodes[index - 2];

      if (
        isNodeValueEqual('all', node) &&
        rule.name.toLowerCase() === 'media' &&
        !prevWord
      ) {
        const nextWord = params.nodes[index + 2];

        if (!legacy || nextWord) {
          removeNode(node);
        }

        if (isNodeValueEqual('and', nextWord)) {
          const nextSpace = params.nodes[index + 1];
          const secondSpace = params.nodes[index + 3];

          removeNode(nextWord);
          removeNode(nextSpace);
          removeNode(secondSpace);
        }
      }
    }
  }, true);

  rule.params = sort(R.uniq(getArguments(params).map(split)), {
    insensitive: true,
  }).join();

  if (!rule.params.length) {
    rule.raws.afterName = '';
  }
});

const hasAllBug = includedIn(['ie 10', 'ie 11']);

export default postcss.plugin('postcss-minify-params', () => {
  return (css, result) => {
    const resultOpts = result.opts || {};
    const browsers = browserslist(null, {
      stats: resultOpts.stats,
      path: __dirname,
      env: resultOpts.env,
    });

    // We should re-arrange parameters only for `@media` and `@supports` at-rules
    return css.walkAtRules(
      /^(media|supports)$/i,
      transform(browsers.some(hasAllBug))
    );
  };
});
