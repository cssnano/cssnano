import { list } from 'postcss';
import stylehacks from 'stylehacks';
import insertCloned from '../insertCloned.js';
import getDecls from '../getDecls.js';
import lastOf from '../lastOf.js';
import mergeRules from '../mergeRules.js';
import minifyTopBottoRightLeft from '../minifyTrbl.js';
import topRightBottomLeft from '../trbl.js';
import parseWidthStyleColor from '../parseWsc.js';
import {
  isValidWidthStyleColor,
  specifiesDistinctComponents,
} from '../validateWsc.js';
import {
  borderAndSideShorthands,
  borderProperty,
  defaultBorderValues,
  physicalBorderShorthands,
  widthStyleColor,
} from './borderData.js';
import {
  mergeRedundant,
  specifiedBy,
  subsumedAfter,
} from './borderLifecycle.js';

/** @import {Declaration} from 'postcss'; */

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
export function optimizeSides(rule) {
  // optimize border-trbl
  const decls = getDecls(rule, new Set(physicalBorderShorthands));

  while (decls.size) {
    const lastNode = /** @type {Declaration} */ (lastOf(decls));
    const lastSide = physicalBorderShorthands.indexOf(
      lastNode.prop.toLowerCase()
    );

    if (
      specifiesDistinctComponents(lastNode.value) &&
      !stylehacks.detect(lastNode)
    ) {
      const prefix = rule.nodes.slice(0, rule.index(lastNode));
      const positions = new Map(prefix.map((node, index) => [node, index]));
      const lastValues = parseWidthStyleColor(lastNode.value);
      /* `parseWsc` lower-cases what it hands back, and the longhands beside it
       * keep the case the stylesheet wrote, so the token itself is what the
       * two get compared and merged as. */
      const tokens = list.space(lastNode.value);
      /** @type {(component: string) => string} */
      const asWritten = (component) =>
        tokens.find((token) => token.toLowerCase() === component) ?? component;

      for (const [i, d] of widthStyleColor.entries()) {
        const specifiers = topRightBottomLeft.map((side, index) =>
          index === lastSide ? undefined : specifiedBy(prefix, side, d)
        );
        const longhands = /** @type {Declaration[]} */ (
          specifiers.filter(Boolean)
        );

        if (
          longhands.length !== topRightBottomLeft.length - 1 ||
          longhands.some(
            (node) =>
              node.important !== lastNode.important || stylehacks.detect(node)
          )
        ) {
          continue;
        }

        /* The three longhands come together where the last of them stands. */
        let refNode = longhands[0];

        for (const node of longhands) {
          if (
            /** @type {number} */ (positions.get(node)) >
            /** @type {number} */ (positions.get(refNode))
          ) {
            refNode = node;
          }
        }

        /* The shorthand specifies a component or resets it to its initial
         * value; either way that is what the side ends up with. */
        const lastNodeValue = lastValues[i]
          ? asWritten(lastValues[i])
          : defaultBorderValues[i];
        const values = specifiers.map((node, index) =>
          index === lastSide
            ? lastNodeValue
            : /** @type {Declaration} */ (node).value
        );
        const value = minifyTopBottoRightLeft(values.join(' '));

        if (value === lastNodeValue) {
          const remaining = tokens
            .filter((token) => token.toLowerCase() !== lastValues[i])
            .join(' ');

          /* Dropping the component from the shorthand leaves the shorthand
           * resetting it, so what replaces it has to come after. */
          if (remaining && remaining.length < lastNode.value.length) {
            lastNode.value = remaining;
            refNode = lastNode;
          }
        }

        insertCloned(
          /** @type {import('postcss').Rule} */ (refNode.parent),
          refNode,
          {
            prop: borderProperty(d),
            value,
          }
        );

        for (const node of longhands) {
          node.remove();
        }
      }
    }

    decls.delete(lastNode);
  }
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
export function mergeRedundantSweep(rule) {
  rule.walkDecls('border', (/** @type {Declaration} */ decl) => {
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
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
export function hoistSubsumedComponents(rule) {
  rule.walkDecls((/** @type {Declaration} */ decl) => {
    if (!borderAndSideShorthands.has(decl.prop.toLowerCase())) {
      return;
    }

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
        const subsumed = subsumedAfter(rule, decl, longhands);

        if (subsumed === undefined) {
          return false;
        }

        if (
          longhands[0].value.toLowerCase() ===
            longhands[1].value.toLowerCase() &&
          longhands[1].value.toLowerCase() ===
            longhands[2].value.toLowerCase() &&
          values[i] !== undefined &&
          longhands[0].value.toLowerCase() === values[i].toLowerCase()
        ) {
          for (const node of subsumed) {
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

          /* The same slot is offered again for the other sides, and a
           * component hoisted out of the shorthand is no longer one it
           * specifies — which is what an absent component already reads as. */
          /** @type {string|undefined} */ (values[i]) = undefined;
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
}
