import { list } from 'postcss';
import stylehacks from 'stylehacks';
import insertCloned from '../insertCloned.js';
import parseTrbl from '../parseTrbl.js';
import getDecls from '../getDecls.js';
import getValue from '../getValue.js';
import mergeRules from '../mergeRules.js';
import minifyTopBottoRightLeft from '../minifyTrbl.js';
import minifyWidthStyleColor from '../minifyWsc.js';
import canMerge from '../canMerge.js';
import topRightBottomLeft from '../trbl.js';
import isCustomProp from '../isCustomProp.js';
import { isFallback, strandsFallback, inheritSupport } from '../isFallback.js';
import canExplode from '../canExplode.js';
import parseWidthStyleColor from '../parseWsc.js';
import {
  isValidWidthStyleColor,
  specifiesComponent,
  specifiesDistinctComponents,
} from '../validateWsc.js';
import cssGlobalKeywords from '../cssGlobalKeywords.js';
import lastOf from '../lastOf.js';
import cleanupDeclarations from '../cleanupDeclarations.js';
import spec from '../spec.js';
import resolveBorderGrid from './borderMatrix.js';
import {
  canMergeValues,
  diffingProps,
  getDistinctShorthands,
  isCloseEnough,
  isCustomProperty,
} from './borderPredicates.js';

/** @import {Declaration} from 'postcss'; */

const borderSpacing = 'border-spacing';
const widthStyleColor = spec.borderComponents;

/**
 * @param {...string} parts
 * @return {string}
 */
function borderProperty(...parts) {
  return `border-${parts.join('-')}`;
}

const physicalBorderShorthands = spec.sides.map((side) => borderProperty(side));
const allSidesBorderShorthands = spec.shorthand('border').longhands;
/** @type {string[]} */
const physicalDirectionalProperties = [];
for (const direction of physicalBorderShorthands) {
  for (const prop of widthStyleColor) {
    physicalDirectionalProperties.push(`${direction}-${prop}`);
  }
}

const defaultBorderValues = allSidesBorderShorthands.map(
  (prop) => /** @type {string} */ (spec.initialValues.get(prop))
);
/* `border` and the shorthand for each side of the box. */
const borderAndSideShorthands = new Set([
  'border',
  ...physicalBorderShorthands,
]);
/* Those, and the properties they are made of. */
const directionalPhysicalProperties = new Set([
  ...physicalBorderShorthands,
  ...physicalDirectionalProperties,
]);
/* What `border` resets without being able to set. */
const borderImageProperties = new Set(spec.shorthand('border').resets);

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

/**
 * `insertCloned` records the support a new node inherits, but these
 * merges place their node themselves; a clone postcss makes carries the value
 * and not the provenance, so it has to be recorded here too.
 *
 * @param {Declaration} source
 * @param {Partial<import('postcss').DeclarationProps>} props
 * @return {Declaration}
 */
function cloneWithSupport(source, props) {
  const clone = Object.assign(source.clone(), props);

  inheritSupport(source, clone);

  return clone;
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

  const diff = diffingProps(values, nextValues, widthStyleColor);

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
 * A border declaration specifies a `<line-width>`, a `<line-style>` and a
 * `<color>` — one of them if it names a component, one of each per side
 * otherwise — and the browser ignores it when a value is none of these,
 * such as the `border-color: none` a stylesheet writes for `border: none`.
 *
 * @param {Declaration} declaration one of `allPhysicalBorderProperties`
 * @return {boolean} whether the declaration sets anything at all
 */
function browserKeeps(declaration) {
  const prop = declaration.prop.toLowerCase();

  if (borderAndSideShorthands.has(prop)) {
    return specifiesDistinctComponents(declaration.value);
  }

  const component = /** @type {string} */ (prop.split('-').at(-1));

  if (!allSidesBorderShorthands.includes(prop)) {
    return specifiesComponent(declaration.value, component);
  }

  /* `parseTrbl` takes the four sides it needs and says nothing about a fifth,
   * which is a token that costs the declaration its meaning. */
  if (list.space(declaration.value).length > spec.sides.length) {
    return false;
  }

  return parseTrbl(declaration.value).every((value) =>
    specifiesComponent(value, component)
  );
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
    declarations.some((declaration) => {
      const prop = declaration.prop.toLowerCase();

      return (
        borderImageProperties.has(prop) ||
        spec.flowRelativeBorderProperties.has(prop)
      );
    })
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
        ((borderAndSideShorthands.has(declaration.prop.toLowerCase()) ||
          allSidesBorderShorthands.includes(declaration.prop.toLowerCase())) &&
          isCustomProp(declaration))
    )
  ) {
    return true;
  }

  /* A declaration the browser ignores sets nothing, so the ones around it mean
   * what they would mean on their own. Every transform here reads it as one
   * that applies, and would move, ignore or rewrite those others against a
   * border no side ever has. */
  if (physical.some((declaration) => !browserKeeps(declaration))) {
    return true;
  }

  const globalComponents = physical.filter((decl) =>
    allSidesBorderShorthands.includes(decl.prop.toLowerCase())
  );
  const directionalDeclarations = physical.filter((decl) =>
    directionalPhysicalProperties.has(decl.prop.toLowerCase())
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

  return (
    specifiesDistinctComponents(declaration.value) &&
    isValidWidthStyleColor(parseWidthStyleColor(declaration.value))
  );
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
  rule.walkDecls((decl) => {
    if (decl.prop.toLowerCase() !== borderSpacing) {
      return;
    }

    const value = list.space(decl.value);

    if (value.length > 1 && value[0] === value[1]) {
      decl.value = value.slice(1).join(' ');
    }
  });
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
function cleanup(rule) {
  rule.walkDecls((decl) => {
    if (borderAndSideShorthands.has(decl.prop.toLowerCase())) {
      decl.value = minifyWidthStyleColor(decl.value);
    }
  });

  const decls = getDecls(rule, allPhysicalBorderProperties);

  cleanupDeclarations(decls, (node, lastNode) => {
    const lastPart = lastNode.prop.split('-').pop();

    return (
      !isCustomProp(lastNode) &&
      !strandsFallback(node, lastNode) &&
      /** @type {number} */ (getLevel(node.prop)) >
        /** @type {number} */ (getLevel(lastNode.prop)) &&
      (node.prop.toLowerCase().includes(lastNode.prop) ||
        node.prop.toLowerCase().endsWith(/** @type {string} */ (lastPart)))
    );
  });
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

  rule.walkDecls((decl) => {
    if (!spec.borderProperties.has(decl.prop.toLowerCase())) {
      return;
    }

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
 * `border`, `border-<side>` and `border-<component>` all reach a side's
 * component without naming it, so the last declaration to set one side's
 * component is not always the longhand that specifies it, and if
 * they follow a longhand, they override the value set by the longhand.
 *
 * @param {import('postcss').ChildNode[]} nodes the nodes preceding the merge
 * @param {string} side one of `topRightBottomLeft`
 * @param {string} component one of `widthStyleColor`
 * @return {Declaration | undefined} the longhand the side's component comes
 * from, when a longhand is where it comes from
 */
function specifiedBy(nodes, side, component) {
  const longhand = borderProperty(side, component);
  const setters = new Set([
    'border',
    borderProperty(side),
    borderProperty(component),
    longhand,
  ]);
  /** @type {Declaration | undefined} */
  let last;

  for (const node of nodes) {
    const { type } = node;

    if (type !== 'decl' || !node.parent) {
      continue;
    }

    if (setters.has(node.prop.toLowerCase())) {
      last = node;
    }
  }

  return last && last.prop.toLowerCase() === longhand ? last : undefined;
}

/**
 * When a merge inserts at a range's start, later declarations for the same
 * property remain. Those that are fallbacks or hacks must stay;
 * others can be subsumed. Returns undefined if any repeat must be preserved.
 *
 * @param {import('postcss').Rule} rule
 * @param {Declaration} start merge insertion point
 * @param {Declaration[]} chosen declarations being merged, one per property
 * @return {Declaration[] | undefined} repeats that can be safely removed,
 * or undefined if any is a fallback or hack
 */
function subsumedAfter(rule, start, chosen) {
  /** @type {Map<string, Declaration>} */
  const wanted = new Map(chosen.map((node) => [node.prop.toLowerCase(), node]));
  const from = rule.index(start);
  /** @type {Declaration[]} */
  const subsumed = [];

  for (const node of rule.nodes) {
    const { type } = node;

    if (type !== 'decl') {
      continue;
    }

    const last = wanted.get(node.prop.toLowerCase());

    if (last === undefined) {
      continue;
    }

    const at = rule.index(node);

    if (at <= from || at > rule.index(last)) {
      continue;
    }

    /* A repeat the browsers that skip the one it repeats still keep is a
     * fallback the author wrote, not a leftover. */
    if (node !== last && (isFallback(node, last) || stylehacks.detect(node))) {
      return undefined;
    }

    subsumed.push(node);
  }

  return subsumed;
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
function mergeSideComponentsToSide(rule) {
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
function mergeSideComponentsToComponent(rule) {
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
function mergeSidesToComponents(rule) {
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
function mergeComponentsToBorder(rule, canCreateBorder) {
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
function mergeComponentsToBorderAndSides(rule, canCreateBorder) {
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
function mergeSidesToBorder(rule, canCreateBorder) {
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
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
function rebindSideCustomProp(rule) {
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
function rebindComponentCustomProp(rule) {
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

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
function optimizeSides(rule) {
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
function mergeRedundantSweep(rule) {
  rule.walkDecls(
    'border',
    (/** @type {import('postcss').Declaration} */ decl) => {
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
    }
  );
}

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
function hoistSubsumedComponents(rule) {
  rule.walkDecls((/** @type {import('postcss').Declaration} */ decl) => {
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

/**
 * @param {import('postcss').Rule} rule
 * @return {void}
 */
function merge(rule) {
  mergeBorderSpacing(rule);

  if (containsUnmergeableBorderDecls(rule)) {
    resolveBorderGrid(rule);
    return;
  }

  const canCreateBorder = hasBorderResetContext(rule);

  mergeSideComponentsToSide(rule);
  mergeSideComponentsToComponent(rule);
  mergeSidesToComponents(rule);
  mergeComponentsToBorder(rule, canCreateBorder);
  mergeComponentsToBorderAndSides(rule, canCreateBorder);
  mergeSidesToBorder(rule, canCreateBorder);
  rebindSideCustomProp(rule);
  rebindComponentCustomProp(rule);
  optimizeSides(rule);
  mergeRedundantSweep(rule);
  hoistSubsumedComponents(rule);

  cleanup(rule);
}

export default {
  explode,
  merge,
};
