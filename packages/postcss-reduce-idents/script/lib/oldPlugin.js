import valueParser from 'postcss-value-parser';
import encode from '../../src/lib/encode.js';
import {
  cssWideKeywords,
  counter,
  counterStyle,
  grid,
  keyframes,
  resolveAtRule,
  resolveProperty,
} from '../../src/lib/slots.js';

const reserved = (values, extra = []) =>
  new Set([...cssWideKeywords, ...values, ...extra]);
const keyframeReserved = reserved(keyframes.reservedKeywords);
const counterReserved = reserved(counter.reservedKeywords, [
  'list-item',
  'page',
]);
const styleReserved = reserved(counterStyle.reservedKeywords, [
  'inline',
  'outside',
  'disc',
  'circle',
  'square',
  'decimal',
]);
const gridReserved = reserved(grid.reservedKeywords);

function cacheValue(cache, value, encoder) {
  if (!cache.has(value))
    cache.set(value, { ident: encoder(value, cache.size), count: 0 });
  return cache.get(value);
}

function words(value, callback) {
  return valueParser(value)
    .walk((node) => callback(node))
    .toString();
}

function functionArguments(node) {
  const args = [[]];
  for (const child of node.nodes) {
    if (child.type === 'div' && child.value === ',') args.push([]);
    else args[args.length - 1].push(child);
  }
  return args;
}

function renameFunctionArguments(value, functions, cache) {
  return valueParser(value)
    .walk((node) => {
      if (node.type !== 'function') return;
      const indexes = functions.get(node.value.toLowerCase());
      if (!indexes) return;
      for (const index of indexes) {
        for (const child of functionArguments(node)[index] ?? []) {
          if (child.type === 'word' && cache.has(child.value)) {
            const item = cache.get(child.value);
            item.count++;
            child.value = item.ident;
          }
        }
      }
      return false;
    })
    .toString();
}

function pluginCreator({ encoder = encode } = {}) {
  return {
    postcssPlugin: 'postcss-reduce-idents',
    // The oracle intentionally keeps all reducer paths in one function so it
    // can be compared with the pre-migration implementation.
    // eslint-disable-next-line complexity
    OnceExit(root) {
      const keyframesCache = new Map();
      const counterCache = new Map();
      const styleCache = new Map();
      const gridCache = new Map();
      const keyframesRules = [],
        styleRules = [],
        gridTemplates = [],
        references = [];
      const counterDeclarations = [],
        counterFunctions = [];

      root.walk((node) => {
        if (node.type === 'atrule') {
          const atRule = resolveAtRule(node.name);
          if (
            atRule === keyframes.atRule &&
            !keyframeReserved.has(node.params.toLowerCase())
          ) {
            cacheValue(keyframesCache, node.params, encoder);
            keyframesRules.push(node);
          }
          if (
            atRule === counterStyle.atRule &&
            !styleReserved.has(node.params.toLowerCase())
          ) {
            cacheValue(styleCache, node.params, encoder);
            styleRules.push(node);
          }
          return;
        }
        if (node.type !== 'decl') return;
        const prop = resolveProperty(node.prop);
        if (keyframes.properties.has(prop)) references.push(node);
        if (counter.properties.has(prop)) counterDeclarations.push(node);
        if (counter.functionProperties.has(prop)) counterFunctions.push(node);
        if (
          counterStyle.properties.has(prop) ||
          (node.parent?.type === 'atrule' &&
            resolveAtRule(node.parent.name) === counterStyle.atRule &&
            counterStyle.descriptors.has(prop))
        )
          styleRules.push(node);
        if (grid.templateProperties.has(prop)) gridTemplates.push(node);
        if (grid.referenceProperties.has(prop)) references.push(node);
      });

      for (const declaration of counterDeclarations) {
        declaration.value = words(declaration.value, (child) => {
          if (
            child.type === 'word' &&
            !valueParser.unit(child.value) &&
            !counterReserved.has(child.value.toLowerCase())
          ) {
            child.value = cacheValue(counterCache, child.value, encoder).ident;
          }
        });
        declaration.value = valueParser(declaration.value).toString();
      }
      for (const declaration of counterFunctions) {
        declaration.value = renameFunctionArguments(
          declaration.value,
          counter.functions,
          counterCache
        );
      }
      for (const declaration of counterDeclarations) {
        declaration.value = valueParser(declaration.value)
          .walk((child) => {
            if (child.type !== 'word' || valueParser.unit(child.value)) return;
            for (const [name, item] of counterCache) {
              if (item.ident === child.value && item.count === 0)
                child.value = name;
            }
          })
          .toString();
      }

      for (const declaration of gridTemplates) {
        words(declaration.value, (child) => {
          if (child.type !== 'word' && child.type !== 'string') return;
          for (const word of child.value.split(/\s+/)) {
            const name = word.replace(/^\[/, '').replace(/\]$/, '');
            if (
              name &&
              !/\.+/.test(name) &&
              !gridReserved.has(name.toLowerCase())
            ) {
              cacheValue(gridCache, name, encoder);
            }
          }
        });
      }

      for (const declaration of styleRules.filter(
        (node) => node.type === 'decl'
      )) {
        declaration.value = valueParser(declaration.value)
          .walk((child) => {
            if (child.type === 'word' && styleCache.has(child.value)) {
              const item = styleCache.get(child.value);
              item.count++;
              child.value = item.ident;
            }
            return child.type !== 'function';
          })
          .toString();
      }
      for (const declaration of references) {
        const prop = resolveProperty(declaration.prop);
        if (keyframes.properties.has(prop)) {
          declaration.value = valueParser(declaration.value)
            .walk((child) => {
              if (child.type === 'word' && keyframesCache.has(child.value)) {
                const item = keyframesCache.get(child.value);
                item.count++;
                child.value = item.ident;
              }
            })
            .toString();
        } else if (grid.referenceProperties.has(prop)) {
          declaration.value = valueParser(declaration.value)
            .walk((child) => {
              if (
                child.type === 'word' &&
                !valueParser.unit(child.value) &&
                gridCache.has(child.value)
              ) {
                const item = gridCache.get(child.value);
                item.count++;
                child.value = item.ident;
              }
            })
            .toString();
        }
      }

      for (const declaration of gridTemplates) {
        words(declaration.value, (child) => {
          if (child.type !== 'word' && child.type !== 'string') return;
          for (const word of child.value.split(/\s+/)) {
            const name = word.replace(/^\[/, '').replace(/\]$/, '');
            if (
              name &&
              !/\.+/.test(name) &&
              !gridReserved.has(name.toLowerCase())
            ) {
              cacheValue(gridCache, name, encoder);
            }
          }
        });
      }
      for (const declaration of gridTemplates) {
        const used =
          declaration.value
            .match(/[A-Za-z_][\w-]*/g)
            ?.some((name) => gridCache.has(name)) ?? false;
        if (!used) continue;
        declaration.value = valueParser(declaration.value)
          .walk((child) => {
            if (child.type === 'function') return;
            const parts = child.value.split(/\s+/).map((word) => {
              const left = word.startsWith('['),
                right = word.endsWith(']');
              const name = word.replace(/^\[/, '').replace(/\]$/, '');
              const item = gridCache.get(name);
              return item
                ? `${left ? '[' : ''}${item.ident}${right ? ']' : ''}`
                : word;
            });
            child.value = parts.join(' ');
            return false;
          })
          .toString();
      }
      for (const [name, item] of keyframesCache) {
        if (item.count > 0) {
          for (const rule of keyframesRules)
            if (rule.params === name) rule.params = item.ident;
        }
      }
      for (const rule of styleRules.filter((node) => node.type === 'atrule')) {
        const item = styleCache.get(rule.params);
        if (item?.count > 0) rule.params = item.ident;
      }
    },
  };
}
pluginCreator.postcss = true;
export { pluginCreator as default, pluginCreator as 'module.exports' };
