import getBrowsersList from '#getBrowsersList';
import valueParser from 'postcss-value-parser';
import cssnanoUtils from 'cssnano-utils';

const { getArguments } = cssnanoUtils;

function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

function aspectRatio(a, b) {
  const divisor = gcd(a, b);
  return [a / divisor, b / divisor];
}

function split(args) {
  return args.map((arg) => valueParser.stringify(arg)).join('');
}

function removeNode(node) {
  node.value = '';
  node.type = 'word';
}

function sortAndDedupe(items) {
  const values = [...new Set(items)];
  values.sort();
  return values.join();
}

function transform(legacy, rule) {
  const ruleName = rule.name.toLowerCase();
  if (!rule.params || !['media', 'supports'].includes(ruleName)) return;

  const params = valueParser(rule.params);
  params.walk((node, index) => {
    if (node.type === 'div') {
      node.before = node.after = '';
    } else if (node.type === 'function') {
      node.before = '';
      if (
        node.nodes[0]?.type === 'word' &&
        node.nodes[0].value.startsWith('--') &&
        node.nodes[2] === undefined
      ) {
        node.after = ' ';
      } else {
        node.after = '';
      }
      if (
        node.nodes[4] &&
        node.nodes[0].value.toLowerCase().indexOf('-aspect-ratio') === 3
      ) {
        const [a, b] = aspectRatio(
          Number(node.nodes[2].value),
          Number(node.nodes[4].value)
        );
        node.nodes[2].value = a.toString();
        node.nodes[4].value = b.toString();
      }
    } else if (node.type === 'space') {
      node.value = ' ';
    } else {
      const prevWord = params.nodes[index - 2];
      if (
        node.value.toLowerCase() === 'all' &&
        ruleName === 'media' &&
        !prevWord
      ) {
        const nextWord = params.nodes[index + 2];
        if (!legacy || nextWord) removeNode(node);
        if (nextWord && nextWord.value.toLowerCase() === 'and') {
          removeNode(nextWord);
          removeNode(params.nodes[index + 1]);
          removeNode(params.nodes[index + 3]);
        }
      }
    }
  }, true);

  rule.params = sortAndDedupe(getArguments(params).map(split));
  if (!rule.params.length) rule.raws.afterName = '';
}

const allBugBrowsers = new Set(['ie 10', 'ie 11']);

function pluginCreator(options = {}) {
  return {
    postcssPlugin: 'postcss-minify-params',
    prepare(result) {
      const { stats, env, from, file } = result.opts || {};
      const browsers = getBrowsersList(options, stats, from, file, env);
      const hasAllBug = !new Set(browsers).isDisjointFrom(allBugBrowsers);
      return {
        OnceExit(css) {
          css.walkAtRules((rule) => transform(hasAllBug, rule));
        },
      };
    },
  };
}

pluginCreator.postcss = true;
export { pluginCreator as default, pluginCreator as 'module.exports' };
