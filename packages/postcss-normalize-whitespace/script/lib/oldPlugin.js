import valueParser from 'postcss-value-parser';

const atrule = 'atrule';
const decl = 'decl';
const rule = 'rule';
const variableFunctions = new Set(['var', 'env', 'constant']);
const ieHackRegex = /\s*(\\9)\s*/;
const whitespaceRegex = /\s/g;

function endsWithEscapingBackslash(value) {
  let backslashes = 0;

  for (let i = value.length - 1; i >= 0 && value[i] === '\\'; i--) {
    backslashes++;
  }

  return backslashes % 2 === 1;
}

function reduceCalcWhitespaces(node) {
  if (node.type === 'space') {
    node.value = ' ';
  } else if (node.type === 'function') {
    if (!variableFunctions.has(node.value.toLowerCase())) {
      node.before = node.after = '';
    }
  }
}

function reduceWhitespaces(node) {
  if (node.type === 'space') {
    node.value = ' ';
  } else if (node.type === 'div') {
    node.before = node.after = '';
  } else if (node.type === 'function') {
    if (!variableFunctions.has(node.value.toLowerCase())) {
      node.before = node.after = '';
    }
    if (node.value.toLowerCase() === 'calc') {
      valueParser.walk(node.nodes, reduceCalcWhitespaces);
      return false;
    }
  }
}

function trimDeclaration(node, cache) {
  if (node.important) {
    node.raws.important = '!important';
  }
  node.value = node.value.replace(ieHackRegex, '$1');
  const value = node.value;

  if (cache.has(value)) {
    node.value = cache.get(value);
  } else {
    const result = valueParser(node.value).walk(reduceWhitespaces).toString();

    node.value = result;
    cache.set(value, result);
  }

  if (node.raws.before) {
    const prev = node.prev();

    if (prev && prev.type !== rule) {
      node.raws.before = node.raws.before.replace(/;/g, '');
    }
  }

  node.raws.between = ':';
  node.raws.semicolon = false;
}

function oldPluginCreator() {
  return {
    postcssPlugin: 'postcss-normalize-whitespace-old',

    OnceExit(css) {
      const declarationCache = new Map();

      css.walk((node) => {
        const { type } = node;

        if ([decl, rule, atrule].includes(type) && node.raws.before) {
          node.raws.before = node.raws.before.replace(whitespaceRegex, '');
        }

        if (type === decl && !node.prop.startsWith('--')) {
          trimDeclaration(node, declarationCache);
        } else if (type === rule || type === atrule) {
          const last = node.last;

          if (
            last &&
            last.type === decl &&
            endsWithEscapingBackslash(last.value) &&
            node.raws.after
          ) {
            last.value += node.raws.after[0];
          }

          node.raws.between = node.raws.after = '';
          node.raws.semicolon = false;
        }
      });

      css.raws.after = '';
    },
  };
}

/** @type {true} */
oldPluginCreator.postcss = true;

export default oldPluginCreator;
