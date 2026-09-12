import stylehacks from 'stylehacks';
import insertCloned from '../insertCloned.js';
import parseTrbl from '../parseTrbl.js';
import mergeRules from '../mergeRules.js';
import minifyTopBottoRightLeft from '../minifyTrbl.js';
import minifyWidthStyleColor from '../minifyWsc.js';
import canMerge from '../canMerge.js';
import topRightBottomLeft from '../trbl.js';
import isCustomProp from '../isCustomProp.js';
import parseWidthStyleColor from '../parseWsc.js';
import {
  isValidWidthStyleColor,
  specifiesComponent,
  specifiesDistinctComponents,
} from '../validateWsc.js';
import {
  allSidesBorderShorthands,
  borderProperty,
  defaultBorderValues,
  physicalBorderShorthands,
  widthStyleColor,
} from './borderData.js';
import { cloneWithSupport } from './borderLifecycle.js';
import {
  canMergeValues,
  getDistinctShorthands,
  isCloseEnough,
  isCustomProperty,
} from './borderPredicates.js';

/** @param {import('postcss').Declaration} decl @return {string} */
const getValue = ({ value }) => value;

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
export function mergeSideComponentsToSide(rule) {
  // border-trbl-wsc -> border-trbl
  for (const direction of topRightBottomLeft) {
    const prop = borderProperty(direction);

    mergeRules(
      rule,
      widthStyleColor.map((style) => borderProperty(direction, style)),
      (rules, lastNode) => {
        const value = rules.map(getValue).join(' ');

        /* One longhand the browser ignores costs that side its width, style or
         * colour; written into the shorthand it costs the side every one of
         * them, as the shorthand is then the invalid declaration. */
        if (!specifiesDistinctComponents(value)) {
          return false;
        }

        if (canMerge(rules, false) && !rules.some(stylehacks.detect)) {
          insertCloned(
            /** @type {import('postcss').Rule} */ (lastNode.parent),
            lastNode,
            {
              prop,
              value,
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
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
export function mergeSideComponentsToComponent(rule) {
  // border-trbl-wsc -> border-wsc
  for (const style of widthStyleColor) {
    const prop = borderProperty(style);

    mergeRules(
      rule,
      topRightBottomLeft.map((direction) => borderProperty(direction, style)),
      (rules, lastNode) => {
        /* The four sides share one declaration afterwards, so a value the
         * browser ignores on one side would take the other three down with it. */
        if (!rules.every((node) => specifiesComponent(node.value, style))) {
          return false;
        }

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
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
export function mergeSidesToComponents(rule) {
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
}

/**
 * @param {import('postcss').Rule} rule
 * @param {boolean} canCreateBorder
 * @return {void}
 */
export function mergeComponentsToBorder(rule, canCreateBorder) {
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
          cloneWithSupport(lastNode, {
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
        cloneWithSupport(lastNode, {
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
}

/**
 * @param {import('postcss').Rule} rule
 * @param {boolean} canCreateBorder
 * @return {void}
 */
export function mergeComponentsToBorderAndSides(rule, canCreateBorder) {
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
      const filtered = mapped.find((p) => p !== none);
      const mostCommon = reduced.toSorted(
        (a, b) =>
          mapped.filter((v) => v === b).length -
          mapped.filter((v) => v === a).length
      )[0];
      const borderValue = reduced.length === 2 ? filtered : mostCommon;

      rule.insertBefore(
        lastNode,
        cloneWithSupport(lastNode, {
          prop: 'border',
          value: borderValue,
        })
      );

      for (const [i, dir] of physicalBorderShorthands.entries()) {
        if (mapped[i] !== borderValue) {
          rule.insertBefore(
            lastNode,
            cloneWithSupport(lastNode, {
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
}

/**
 * @param {import('postcss').Rule} rule
 * @param {boolean} canCreateBorder
 * @return {void}
 */
export function mergeSidesToBorder(rule, canCreateBorder) {
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
        cloneWithSupport(lastNode, {
          prop: 'border',
          value: minifyWidthStyleColor(first ? values[0] : values[1]),
        })
      );

      if (reduced[1]) {
        const value = first ? reduced[1] : reduced[0];
        const prop = physicalBorderShorthands[values.indexOf(value)];
        rule.insertBefore(
          lastNode,
          cloneWithSupport(lastNode, {
            prop,
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
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
export function rebindSideCustomProp(rule) {
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

        const wscProp = rules.find((r) => r !== lastNode);

        if (!wscProp) {
          return false;
        }

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
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
export function rebindComponentCustomProp(rule) {
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

      const wscProp = rules.find((r) => r !== lastNode);

      if (!wscProp) {
        return false;
      }

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
