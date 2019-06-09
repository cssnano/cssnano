import { plugin } from 'postcss';
import sort from 'alphanum-sort';
import parser from 'postcss-selector-parser';
import * as R from 'ramda';
import cacheFn from './lib/cacheFn';
import canUnquote from './lib/canUnquote';
import includedIn from './lib/includedIn';
import isNodeValueEqual from './lib/isNodeValueEqual';
import unquote from './lib/unquote';

const isCustomMixin = R.endsWith(':');

const isSelectorNode = R.propEq('type', 'selector');

const pseudoElements = [
  '::before',
  '::after',
  '::first-letter',
  '::first-line',
];

const parseSelectors = R.curry((transform, selectors) =>
  parser(transform).processSync(selectors)
);

function attribute(selector) {
  if (selector.value) {
    selector.value = R.compose(
      R.when(canUnquote, unquote),
      R.trim,
      // Join selectors that are split over new lines
      R.replace(/\\\n/g, '')
    )(selector.value);

    selector.operator = selector.operator.trim();
  }

  if (!selector.raws) {
    selector.raws = {};
  }

  if (!selector.raws.spaces) {
    selector.raws.spaces = {};
  }

  selector.raws.spaces.attribute = {
    before: '',
    after: '',
  };

  selector.raws.spaces.operator = {
    before: '',
    after: '',
  };

  selector.raws.spaces.value = {
    before: '',
    after: selector.insensitive ? ' ' : '',
  };

  if (selector.insensitive) {
    selector.raws.spaces.insensitive = {
      before: '',
      after: '',
    };
  }

  selector.attribute = selector.attribute.trim();
}

function combinator(selector) {
  const value = selector.value.trim();

  selector.value = value.length ? value : ' ';
}

const pseudoReplacements = {
  ':nth-child': ':first-child',
  ':nth-of-type': ':first-of-type',
  ':nth-last-child': ':last-child',
  ':nth-last-of-type': ':last-of-type',
};

const isNodeEqualToOne = isNodeValueEqual('1');

function pseudo(selector) {
  const value = selector.value.toLowerCase();

  if (selector.nodes.length === 1 && pseudoReplacements[value]) {
    const first = selector.at(0);
    const one = first.at(0);

    if (first.length === 1) {
      if (isNodeEqualToOne(one)) {
        selector.replaceWith(
          parser.pseudo({
            value: pseudoReplacements[value],
          })
        );
      }

      if (isNodeValueEqual('even', one)) {
        one.value = '2n';
      }
    }

    if (first.length === 3) {
      const two = first.at(1);
      const three = first.at(2);

      if (
        isNodeValueEqual('2n', one) &&
        isNodeValueEqual('+', two) &&
        isNodeEqualToOne(three)
      ) {
        one.value = 'odd';

        two.remove();
        three.remove();
      }
    }

    return;
  }

  const uniques = [];

  selector.walk((child) => {
    if (isSelectorNode(child)) {
      const childStr = String(child);

      if (includedIn(uniques, childStr)) {
        child.remove();
      } else {
        uniques.push(childStr);
      }
    }
  });

  if (includedIn(pseudoElements, value)) {
    selector.value = selector.value.slice(1);
  }
}

const tagReplacements = {
  from: '0%',
  '100%': 'to',
};

function tag(selector) {
  const value = selector.value.toLowerCase();

  if (R.has(value, tagReplacements)) {
    selector.value = tagReplacements[value];
  }
}

function universal(selector) {
  const next = selector.next();

  if (next && next.type !== 'combinator') {
    selector.remove();
  }
}

const reducers = {
  attribute,
  combinator,
  pseudo,
  tag,
  universal,
};

const selectorValue = R.prop('selector');
const rawSelectorValue = R.path(['raws', 'selector', 'value']);
const rawSelectorRaw = R.path(['raws', 'selector', 'raw']);

const resolveSelectorValue = R.ifElse(
  R.converge(R.equals, [rawSelectorValue, selectorValue]),
  rawSelectorRaw,
  selectorValue
);

const transform = cacheFn(
  R.unless(
    isCustomMixin,
    parseSelectors((selectors) => {
      selectors.nodes = sort(selectors.nodes, { insensitive: true });

      const uniqueSelectors = [];

      selectors.walk((selector) => {
        const { type } = selector;

        // Trim whitespace around the value
        selector.spaces.before = selector.spaces.after = '';

        if (R.has(type, reducers)) {
          reducers[type](selector);

          return;
        }

        if (isSelectorNode(selector) && selector.parent.type !== 'pseudo') {
          const toString = String(selector);
          if (includedIn(uniqueSelectors, toString)) {
            selector.remove();
          } else {
            uniqueSelectors.push(toString);
          }
        }
      });
    })
  )
);

export default plugin('postcss-minify-selectors', () => {
  return (css) => {
    css.walkRules((rule) => {
      rule.selector = R.compose(
        transform,
        resolveSelectorValue
      )(rule);
    });
  };
});
