'use strict';

const { list } = require('postcss');
const stylehacks = require('stylehacks');
const insertCloned = require('../insertCloned.js');
const parseTrbl = require('../parseTrbl.js');
const hasAllProps = require('../hasAllProps.js');
const getDecls = require('../getDecls.js');
const getRules = require('../getRules.js');
const getValue = require('../getValue.js');
const mergeRules = require('../mergeRules.js');
const minifyTopBottoRightLeft = require('../minifyTrbl.js');
const minifyWidthStyleColor = require('../minifyWsc.js');
const canMerge = require('../canMerge.js');
const topRightBottomLeft = require('../trbl.js');
const isCustomProp = require('../isCustomProp.js');
const canExplode = require('../canExplode.js');
const getLastNode = require('../getLastNode.js');
const parseWidthStyleColor = require('../parseWsc.js');
const { isValidWidthStyleColor } = require('../validateWsc.js');
const cssGlobalKeywords = require('../cssGlobalKeywords.js');

/** @import {Declaration} from 'postcss'; */

const widthStyleColor = ['width', 'style', 'color'];
const defaultBorderValues = ['medium', 'none', 'currentcolor'];
const colorMightRequireFallback =
  /(hsla|rgba|color|hwb|lab|lch|oklab|oklch)\(/i;

const borderSpacingRegex = /^border-spacing$/i;
const borderStyleRegex = /^border($|-(top|right|bottom|left)$)/i;
const borderRegex = /^border/i;
const borderImageRegex = /^border-image($|-)/i;
const logicalBorderRegex = /^border-(block|inline|start|end)($|-)/i;
const directionalPhysicalRegex =
  /^border-(top|right|bottom|left)($|-(width|style|color)$)/i;
const customPropRegex = /var\s*\(\s*--/i;

/**
 * @param {...string} parts
 * @return {string}
 */
function borderProperty(...parts) {
  return `border-${parts.join('-')}`;
}

const physicalBorderShorthands = [
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
];
const allSidesBorderShorthands = [
  'border-width',
  'border-style',
  'border-color',
];
/** @type {string[]} */
const physicalDirectionalProperties = [];
for (const direction of physicalBorderShorthands) {
  for (const prop of widthStyleColor) {
    physicalDirectionalProperties.push(`${direction}-${prop}`);
  }
}

const precedence = [
  ['border'],
  physicalBorderShorthands.concat(allSidesBorderShorthands),
  physicalDirectionalProperties,
];

const allPhysicalBorderProperties = new Set(precedence.flat());
const borderResetRules = new WeakSet();

/**
 * @param {string} prop
 * @return {number | undefined}
 */
function getLevel(prop) {
  for (let i = 0; i < precedence.length; i++) {
    if (precedence[i].includes(prop.toLowerCase())) {
      return i;
    }
  }
  return undefined;
}

/** @type {(value: string) => boolean} */
const isCustomProperty = (value) =>
  value !== undefined && value.search(customPropRegex) !== -1;

/**
 * @param {string[]} values
 * @return {boolean}
 */
function canMergeValues(values) {
  return !values.some(isCustomProperty);
}

/**
 * @param {import('postcss').Declaration} decl
 * @return {string}
 */
function getColorValue(decl) {
  if (decl.prop.slice(-5) === 'color') {
    return decl.value;
  }

  return parseWidthStyleColor(decl.value)[2] || defaultBorderValues[2];
}

/**
 * @param {[string, string, string]} values
 * @param {[string, string, string]} nextValues
 * @return {string[]}
 */
function diffingProps(values, nextValues) {
  const diff = [];
  for (const [i, curr] of widthStyleColor.entries()) {
    if (values[i] === nextValues[i]) {
      continue;
    }

    diff.push(curr);
  }
  return diff;
}

/**
 * @param {{values: [string, string, string], nextValues: [string, string, string], decl: import('postcss').Declaration, nextDecl: import('postcss').Declaration, index: number}} arg
 * @return {void}
 */
function mergeRedundant({ values, nextValues, decl, nextDecl, index }) {
  if (!canMerge([decl, nextDecl])) {
    return;
  }

  if (stylehacks.detect(decl) || stylehacks.detect(nextDecl)) {
    return;
  }

  const diff = diffingProps(values, nextValues);

  if (diff.length !== 1) {
    return;
  }

  const prop = /** @type {string} */ (diff.pop());
  const position = widthStyleColor.indexOf(prop);

  const prop1 = `${nextDecl.prop}-${prop}`;
  const prop2 = `border-${prop}`;

  const props = parseTrbl(values[position]);

  props[index] = nextValues[position];

  const borderValue2 = values.filter((e, i) => i !== position).join(' ');
  const propValue2 = minifyTopBottoRightLeft(props);

  const origLength = (
    minifyWidthStyleColor(decl.value) +
    nextDecl.prop +
    nextDecl.value
  ).length;
  const newLength1 =
    decl.value.length +
    prop1.length +
    minifyWidthStyleColor(nextValues[position]).length;
  const newLength2 = borderValue2.length + prop2.length + propValue2.length;

  if (newLength1 < newLength2 && newLength1 < origLength) {
    nextDecl.prop = prop1;
    nextDecl.value = nextValues[position];
  }

  if (newLength2 < newLength1 && newLength2 < origLength) {
    decl.value = borderValue2;
    nextDecl.prop = prop2;
    nextDecl.value = propValue2;
  }
}

/**
 * @param {string | string[]} mapped
 * @return {boolean}
 */
function isCloseEnough(mapped) {
  return (
    (mapped[0] === mapped[1] && mapped[1] === mapped[2]) ||
    (mapped[1] === mapped[2] && mapped[2] === mapped[3]) ||
    (mapped[2] === mapped[3] && mapped[3] === mapped[0]) ||
    (mapped[3] === mapped[0] && mapped[0] === mapped[1])
  );
}

/**
 * @param {string[]} mapped
 * @return {string[]}
 */
function getDistinctShorthands(mapped) {
  return [...new Set(mapped)];
}

/**
 * @param {import('postcss').Rule} rule
 * @return {boolean}
 */
function containsUnmergeableBorderDecls(rule) {
  const declarations = /** @type {Declaration[]} */ (
    rule.nodes.filter((node) => node.type === 'decl')
  );

  if (
    declarations.some(
      (declaration) =>
        borderImageRegex.test(declaration.prop) ||
        logicalBorderRegex.test(declaration.prop)
    )
  ) {
    return true;
  }

  const physical = declarations.filter((declaration) =>
    allPhysicalBorderProperties.has(declaration.prop.toLowerCase())
  );

  if (
    physical.some(
      (declaration) =>
        cssGlobalKeywords.has(declaration.value.toLowerCase()) ||
        ((borderStyleRegex.test(declaration.prop) ||
          allSidesBorderShorthands.includes(declaration.prop.toLowerCase())) &&
          isCustomProp(declaration))
    )
  ) {
    return true;
  }

  const globalComponents = physical.filter((decl) =>
    allSidesBorderShorthands.includes(decl.prop.toLowerCase())
  );
  const directionalDeclarations = physical.filter((decl) =>
    directionalPhysicalRegex.test(decl.prop)
  );

  return globalComponents.length > 1 && directionalDeclarations.length > 0;
}

/**
 * @param {import('postcss').Node} node
 * @return {boolean}
 */
function establishesBorderReset(node) {
  if (node.type !== 'decl') {
    return false;
  }

  const declaration = /** @type {Declaration} */ (node);

  if (
    declaration.prop.toLowerCase() !== 'border' ||
    !canExplode(declaration) ||
    stylehacks.detect(declaration)
  ) {
    return false;
  }

  return isValidWidthStyleColor(parseWidthStyleColor(declaration.value));
}

/**
 * @param {import('postcss').Rule} rule
 * @return {boolean}
 */
function hasBorderResetContext(rule) {
  return borderResetRules.has(rule) || rule.nodes.some(establishesBorderReset);
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
function mergeBorderSpacing(rule) {
  rule.walkDecls(borderSpacingRegex, (decl) => {
    const value = list.space(decl.value);

    if (value.length > 1 && value[0] === value[1]) {
      decl.value = value.slice(1).join(' ');
    }
  });
}

/**
 * Removes duplicate declarations from a declaration list.
 *
 * @param {import('postcss').Declaration[]} decls
 * @param {import('postcss').Declaration | undefined} lastNode
 * @returns {import('postcss').Declaration[]}
 */
function removeDuplicateDeclarations(decls, lastNode) {
  let duplicateDeclarations = decls.filter(
    (node) =>
      !stylehacks.detect(/** @type {Declaration} */ (lastNode)) &&
      !stylehacks.detect(node) &&
      node !== lastNode &&
      node.important === /** @type {Declaration} */ (lastNode).important &&
      node.prop === /** @type {Declaration} */ (lastNode).prop &&
      !(
        !isCustomProp(node) &&
        isCustomProp(/** @type {Declaration} */ (lastNode))
      )
  );

  if (duplicateDeclarations.length) {
    if (
      colorMightRequireFallback.test(
        getColorValue(/** @type {Declaration} */ (lastNode))
      )
    ) {
      const preserve = duplicateDeclarations
        .filter((node) => !colorMightRequireFallback.test(getColorValue(node)))
        .pop();

      duplicateDeclarations = duplicateDeclarations.filter(
        (node) => node !== preserve
      );
    }
    for (const node of duplicateDeclarations) {
      node.remove();
    }
  }

  return decls.filter(
    (node) => node !== lastNode && !duplicateDeclarations.includes(node)
  );
}

/**
 * Removes lower precedence declarations from a declaration list.
 *
 * @param {import('postcss').Declaration[]} decls
 * @param {import('postcss').Declaration | undefined} lastNode
 * @param {string | undefined} lastPart
 * @returns {import('postcss').Declaration[]}
 */
function removeLowerPrecedenceDeclarations(decls, lastNode, lastPart) {
  const lesser = decls.filter(
    (node) =>
      !stylehacks.detect(/** @type {Declaration} */ (lastNode)) &&
      !stylehacks.detect(node) &&
      !isCustomProp(/** @type {Declaration} */ (lastNode)) &&
      node !== lastNode &&
      node.important === /** @type {Declaration} */ (lastNode).important &&
      /** @type {number} */ (getLevel(node.prop)) >
        /** @type {number} */ (
          getLevel(/** @type {Declaration} */ (lastNode).prop)
        ) &&
      (node.prop
        .toLowerCase()
        .includes(/** @type {Declaration} */ (lastNode).prop) ||
        node.prop.toLowerCase().endsWith(/** @type {string} */ (lastPart)))
  );

  for (const node of lesser) {
    node.remove();
  }
  return decls.filter((node) => !lesser.includes(node));
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
function cleanup(rule) {
  rule.walkDecls(borderStyleRegex, (decl) => {
    decl.value = minifyWidthStyleColor(decl.value);
  });

  let decls = getDecls(rule, allPhysicalBorderProperties);

  while (decls.length) {
    const lastNode = decls.at(-1);
    const lastPart = /** @type {Declaration} */ (lastNode).prop
      .split('-')
      .pop();
    decls = removeLowerPrecedenceDeclarations(decls, lastNode, lastPart);

    decls = removeDuplicateDeclarations(decls, lastNode);
  }
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
function explode(rule) {
  if (rule.nodes.some(establishesBorderReset)) {
    borderResetRules.add(rule);
  }

  if (containsUnmergeableBorderDecls(rule)) {
    return;
  }

  rule.walkDecls(borderRegex, (decl) => {
    if (!canExplode(decl)) {
      return;
    }

    if (stylehacks.detect(decl)) {
      return;
    }

    const prop = decl.prop.toLowerCase();

    // border -> border-trbl
    if (prop === 'border') {
      if (isValidWidthStyleColor(parseWidthStyleColor(decl.value))) {
        for (const direction of physicalBorderShorthands) {
          insertCloned(
            /** @type {import('postcss').Rule} */ (decl.parent),
            decl,
            { prop: direction }
          );
        }

        decl.remove();
      }
    }

    // border-trbl -> border-trbl-wsc
    if (physicalBorderShorthands.some((direction) => prop === direction)) {
      const values = parseWidthStyleColor(decl.value);

      if (isValidWidthStyleColor(values)) {
        for (const [i, d] of widthStyleColor.entries()) {
          insertCloned(
            /** @type {import('postcss').Rule} */ (decl.parent),
            decl,
            {
              prop: `${prop}-${d}`,
              value: values[i] || defaultBorderValues[i],
            }
          );
        }

        decl.remove();
      }
    }

    // border-wsc -> border-trbl-wsc
    widthStyleColor.some((style) => {
      if (prop !== borderProperty(style)) {
        return false;
      }

      if (isCustomProp(decl)) {
        decl.prop = decl.prop.toLowerCase();
        return false;
      }
      for (const [i, value] of parseTrbl(decl.value).entries()) {
        insertCloned(
          /** @type {import('postcss').Rule} */ (decl.parent),
          decl,
          {
            prop: borderProperty(topRightBottomLeft[i], style),
            value,
          }
        );
      }

      return decl.remove();
    });
  });
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
function merge(rule) {
  mergeBorderSpacing(rule);

  if (containsUnmergeableBorderDecls(rule)) {
    return;
  }

  const canCreateBorder = hasBorderResetContext(rule);

  // border-trbl-wsc -> border-trbl
  for (const direction of topRightBottomLeft) {
    const prop = borderProperty(direction);

    mergeRules(
      rule,
      widthStyleColor.map((style) => borderProperty(direction, style)),
      (rules, lastNode) => {
        if (canMerge(rules, false) && !rules.some(stylehacks.detect)) {
          insertCloned(
            /** @type {import('postcss').Rule} */ (lastNode.parent),
            lastNode,
            {
              prop,
              value: rules.map(getValue).join(' '),
            }
          );
          for (const node of rules) {
            node.remove();
          }

          return true;
        }
        return false;
      }
    );
  }

  // border-trbl-wsc -> border-wsc
  for (const style of widthStyleColor) {
    const prop = borderProperty(style);

    mergeRules(
      rule,
      topRightBottomLeft.map((direction) => borderProperty(direction, style)),
      (rules, lastNode) => {
        if (canMerge(rules) && !rules.some(stylehacks.detect)) {
          insertCloned(
            /** @type {import('postcss').Rule} */ (lastNode.parent),
            lastNode,
            {
              prop,
              value: minifyTopBottoRightLeft(rules.map(getValue).join(' ')),
            }
          );

          for (const node of rules) {
            node.remove();
          }

          return true;
        }
        return false;
      }
    );
  }

  // border-trbl -> border-wsc
  mergeRules(rule, physicalBorderShorthands, (rules, lastNode) => {
    if (rules.some(stylehacks.detect)) {
      return false;
    }

    const values = rules.map(({ value }) => value);

    if (!canMergeValues(values)) {
      return false;
    }

    const parsed = values.map((value) => parseWidthStyleColor(value));

    if (!parsed.every(isValidWidthStyleColor)) {
      return false;
    }

    for (const [i, d] of widthStyleColor.entries()) {
      const value = parsed.map((v) => v[i] || defaultBorderValues[i]);

      if (canMergeValues(value)) {
        insertCloned(
          /** @type {import('postcss').Rule} */ (lastNode.parent),
          lastNode,
          {
            prop: borderProperty(d),
            value: minifyTopBottoRightLeft(
              /** @type {[string, string, string, string]} */ (value)
            ),
          }
        );
      } else {
        insertCloned(
          /** @type {import('postcss').Rule} */ (lastNode.parent),
          lastNode
        );
      }
    }

    for (const node of rules) {
      node.remove();
    }

    return true;
  });

  // border-wsc -> border
  // border-wsc -> border + border-color
  // border-wsc -> border + border-dir
  mergeRules(rule, allSidesBorderShorthands, (rules, lastNode) => {
    if (!canCreateBorder || rules.some(stylehacks.detect)) {
      return false;
    }

    const values = rules.map((node) => parseTrbl(node.value));
    const mapped = [0, 1, 2, 3].map((i) =>
      [values[0][i], values[1][i], values[2][i]].join(' ')
    );

    if (!canMergeValues(mapped)) {
      return false;
    }

    const [width, style, color] = rules;
    const reduced = getDistinctShorthands(mapped);

    if (isCloseEnough(mapped) && canMerge(rules, false)) {
      const first =
        mapped.indexOf(reduced[0]) !== mapped.lastIndexOf(reduced[0]);

      const border = insertCloned(
        /** @type {import('postcss').Rule} */ (lastNode.parent),
        lastNode,
        {
          prop: 'border',
          value: first ? reduced[0] : reduced[1],
        }
      );

      if (reduced[1]) {
        const value = first ? reduced[1] : reduced[0];
        const prop = borderProperty(topRightBottomLeft[mapped.indexOf(value)]);

        rule.insertAfter(
          border,
          Object.assign(lastNode.clone(), {
            prop,
            value,
          })
        );
      }
      for (const node of rules) {
        node.remove();
      }

      return true;
    } else if (reduced.length === 1 && canMerge([width, style], false)) {
      rule.insertBefore(
        color,
        Object.assign(lastNode.clone(), {
          prop: 'border',
          value: [width, style].map(getValue).join(' '),
        })
      );

      for (const node of rules) {
        if (node.prop.toLowerCase() !== allSidesBorderShorthands[2]) {
          node.remove();
        }
      }

      return true;
    }
    return false;
  });

  // border-wsc -> border + border-trbl
  mergeRules(rule, allSidesBorderShorthands, (rules, lastNode) => {
    if (!canCreateBorder || rules.some(stylehacks.detect)) {
      return false;
    }

    const values = rules.map((node) => parseTrbl(node.value));
    const mapped = [0, 1, 2, 3].map((i) =>
      [values[0][i], values[1][i], values[2][i]].join(' ')
    );
    const reduced = getDistinctShorthands(mapped);
    const none = 'medium none currentcolor';

    if (reduced.length > 1 && reduced.length < 4 && reduced.includes(none)) {
      const filtered = mapped.filter((p) => p !== none);
      const mostCommon = reduced.sort(
        (a, b) =>
          mapped.filter((v) => v === b).length -
          mapped.filter((v) => v === a).length
      )[0];
      const borderValue = reduced.length === 2 ? filtered[0] : mostCommon;

      rule.insertBefore(
        lastNode,
        Object.assign(lastNode.clone(), {
          prop: 'border',
          value: borderValue,
        })
      );

      for (const [i, dir] of physicalBorderShorthands.entries()) {
        if (mapped[i] !== borderValue) {
          rule.insertBefore(
            lastNode,
            Object.assign(lastNode.clone(), {
              prop: dir,
              value: mapped[i],
            })
          );
        }
      }

      for (const node of rules) {
        node.remove();
      }

      return true;
    }
    return false;
  });

  // border-trbl -> border
  // border-trbl -> border + border-trbl
  mergeRules(rule, physicalBorderShorthands, (rules, lastNode) => {
    if (!canCreateBorder || rules.some(stylehacks.detect)) {
      return false;
    }

    const values = rules.map((node) => {
      const wscValue = parseWidthStyleColor(node.value);

      if (!isValidWidthStyleColor(wscValue)) {
        return node.value;
      }

      return wscValue
        .map((value, i) => value || defaultBorderValues[i])
        .join(' ');
    });

    const reduced = getDistinctShorthands(values);

    if (isCloseEnough(values)) {
      const first =
        values.indexOf(reduced[0]) !== values.lastIndexOf(reduced[0]);

      rule.insertBefore(
        lastNode,
        Object.assign(lastNode.clone(), {
          prop: 'border',
          value: minifyWidthStyleColor(first ? values[0] : values[1]),
        })
      );

      if (reduced[1]) {
        const value = first ? reduced[1] : reduced[0];
        const prop = physicalBorderShorthands[values.indexOf(value)];
        rule.insertBefore(
          lastNode,
          Object.assign(lastNode.clone(), {
            prop: prop,
            value: minifyWidthStyleColor(value),
          })
        );
      }

      for (const node of rules) {
        node.remove();
      }

      return true;
    }
    return false;
  });

  // border-trbl-wsc + border-trbl (custom prop) -> border-trbl + border-trbl-wsc (custom prop)
  for (const direction of physicalBorderShorthands) {
    for (const [i, style] of widthStyleColor.entries()) {
      const prop = `${direction}-${style}`;

      mergeRules(rule, [direction, prop], (rules, lastNode) => {
        if (lastNode.prop !== direction) {
          return false;
        }

        const values = parseWidthStyleColor(lastNode.value);

        if (!isValidWidthStyleColor(values)) {
          return false;
        }

        const wscProp = rules.filter((r) => r !== lastNode)[0];

        if (!isCustomProperty(values[i]) || isCustomProp(wscProp)) {
          return false;
        }

        const wscValue = values[i];

        values[i] = wscProp.value;

        if (canMerge(rules, false) && !rules.some(stylehacks.detect)) {
          insertCloned(
            /** @type {import('postcss').Rule} */ (lastNode.parent),
            lastNode,
            {
              prop,
              value: wscValue,
            }
          );
          lastNode.value = minifyWidthStyleColor(/** @type {any} */ (values));

          wscProp.remove();

          return true;
        }
        return false;
      });
    }
  }

  // border-wsc + border (custom prop) -> border + border-wsc (custom prop)
  for (const [i, style] of widthStyleColor.entries()) {
    const prop = borderProperty(style);
    mergeRules(rule, ['border', prop], (rules, lastNode) => {
      if (lastNode.prop !== 'border') {
        return false;
      }
      const values = parseWidthStyleColor(lastNode.value);

      if (!isValidWidthStyleColor(values)) {
        return false;
      }

      const wscProp = rules.filter((r) => r !== lastNode)[0];

      if (!isCustomProperty(values[i]) || isCustomProp(wscProp)) {
        return false;
      }

      const wscValue = values[i];

      values[i] = wscProp.value;

      if (canMerge(rules, false) && !rules.some(stylehacks.detect)) {
        insertCloned(
          /** @type {import('postcss').Rule} */ (lastNode.parent),
          lastNode,
          {
            prop,
            value: wscValue,
          }
        );
        lastNode.value = minifyWidthStyleColor(/** @type {any} */ (values));
        wscProp.remove();

        return true;
      }
      return false;
    });
  }

  // optimize border-trbl
  let decls = getDecls(rule, new Set(physicalBorderShorthands));

  while (decls.length) {
    const lastNode = decls.at(-1);

    for (const [i, d] of widthStyleColor.entries()) {
      const names = physicalBorderShorthands
        .filter((name) => name !== /** @type {Declaration} */ (lastNode).prop)
        .map((name) => `${name}-${d}`);

      let nodes = rule.nodes.slice(
        0,
        rule.nodes.indexOf(/** @type {Declaration} */ (lastNode))
      );

      const border = getLastNode(nodes, 'border');

      if (border) {
        nodes = nodes.slice(nodes.indexOf(border));
      }

      const props = nodes.filter(
        (node) =>
          node.type === 'decl' &&
          names.includes(node.prop) &&
          node.important === /** @type {Declaration} */ (lastNode).important
      );
      const rules = getRules(
        /** @type {import('postcss').Declaration[]} */ (props),
        names
      );

      if (hasAllProps(rules, ...names) && !rules.some(stylehacks.detect)) {
        const values = rules.map((node) => (node ? node.value : null));
        const filteredValues = values.filter(Boolean);
        const lastNodeValue = list.space(
          /** @type {Declaration} */ (lastNode).value
        )[i];

        values[
          physicalBorderShorthands.indexOf(
            /** @type {Declaration} */ (lastNode).prop
          )
        ] = lastNodeValue;

        let value = minifyTopBottoRightLeft(values.join(' '));

        if (
          filteredValues[0] === filteredValues[1] &&
          filteredValues[1] === filteredValues[2]
        ) {
          value = /** @type {string} */ (filteredValues[0]);
        }

        let refNode = props.at(-1);

        if (value === lastNodeValue) {
          refNode = lastNode;
          const valueArray = list.space(
            /** @type {Declaration} */ (lastNode).value
          );
          valueArray.splice(i, 1);
          /** @type {Declaration} */ (lastNode).value = valueArray.join(' ');
        }

        insertCloned(
          /** @type {import('postcss').Rule} */ (
            /** /** @type {Declaration} */ (refNode).parent
          ),
          /** @type {Declaration} */ (refNode),
          {
            prop: borderProperty(d),
            value,
          }
        );

        decls = decls.filter((node) => !rules.includes(node));
        for (const node of rules) {
          node.remove();
        }
      }
    }

    decls = decls.filter((node) => node !== lastNode);
  }

  rule.walkDecls('border', (decl) => {
    const nextDecl = decl.next();

    if (!nextDecl || nextDecl.type !== 'decl') {
      return false;
    }

    const index = physicalBorderShorthands.indexOf(nextDecl.prop);

    if (index === -1) {
      return;
    }

    const values = parseWidthStyleColor(decl.value);
    const nextValues = parseWidthStyleColor(nextDecl.value);

    if (
      !isValidWidthStyleColor(values) ||
      !isValidWidthStyleColor(nextValues)
    ) {
      return;
    }

    const config = {
      values,
      nextValues,
      decl,
      nextDecl,
      index,
    };

    return mergeRedundant(config);
  });

  rule.walkDecls(borderStyleRegex, (decl) => {
    const values = parseWidthStyleColor(decl.value);

    if (!isValidWidthStyleColor(values)) {
      return;
    }

    const position = physicalBorderShorthands.indexOf(decl.prop);
    const dirs = [...physicalBorderShorthands];

    dirs.splice(position, 1);
    for (const [i, d] of widthStyleColor.entries()) {
      const props = dirs.map((dir) => `${dir}-${d}`);

      mergeRules(rule, [decl.prop, ...props], (rules) => {
        if (!rules.includes(decl)) {
          return false;
        }

        const longhands = rules.filter((p) => p !== decl);

        if (
          longhands[0].value.toLowerCase() ===
            longhands[1].value.toLowerCase() &&
          longhands[1].value.toLowerCase() ===
            longhands[2].value.toLowerCase() &&
          values[i] !== undefined &&
          longhands[0].value.toLowerCase() === values[i].toLowerCase()
        ) {
          for (const node of longhands) {
            node.remove();
          }

          insertCloned(
            /** @type {import('postcss').Rule} */ (decl.parent),
            decl,
            {
              prop: borderProperty(d),
              value: values[i],
            }
          );

          /** @type {string|null} */ (values[i]) = null;
        }
        return false;
      });

      const newValue = values.join(' ');

      if (newValue) {
        decl.value = newValue;
      } else {
        decl.remove();
      }
    }
  });

  cleanup(rule);
}

module.exports = {
  explode,
  merge,
};
