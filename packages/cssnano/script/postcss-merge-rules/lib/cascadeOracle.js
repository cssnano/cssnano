import postcss from 'postcss';

/** @import {ChildNode, Container} from 'postcss' */

/**
 * @typedef {{print?: boolean, direction?: 'ltr' | 'rtl'}} Environment
 * @typedef {{tag: string, classes: string[], id: boolean, inDiv: boolean, pseudo: boolean, name: string}} Element
 * @typedef {{matches: (element: Element) => boolean, specificity: number}} CompiledSelector
 * @typedef {{selectors: CompiledSelector[], prop: string, value: string, important: boolean, layer: string | null, order: number}} CascadedDeclaration
 */

// The longhands each generated property sets, in a horizontal writing mode.
// This table is the oracle, so it is written from CSS Box Model, Backgrounds
// and Logical Properties rather than taken from the plugin's property data.
/** @type {Record<string, (direction: 'ltr' | 'rtl') => string[]>} */
const longhandsOf = {
  color: () => ['color'],
  top: () => ['top'],
  direction: () => ['direction'],
  margin: () => ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
  'margin-top': () => ['margin-top'],
  'margin-left': () => ['margin-left'],
  'margin-block-start': () => ['margin-top'],
  'margin-inline': () => ['margin-left', 'margin-right'],
  'margin-inline-start': (direction) => [
    direction === 'rtl' ? 'margin-right' : 'margin-left',
  ],
  background: () => ['background-color', 'background-image'],
  'background-color': () => ['background-color'],
};

// `all` resets every property except `direction`, `unicode-bidi` and custom
// properties (CSS Cascading and Inheritance 4).
const resetByAll = [
  ...new Set(
    Object.values(longhandsOf).flatMap((longhands) => longhands('ltr'))
  ),
]
  .filter((name) => name !== 'direction')
  .toSorted();

const classSets = [
  [],
  ['a'],
  ['b'],
  ['c'],
  ['a', 'b'],
  ['a', 'c'],
  ['b', 'c'],
  ['a', 'b', 'c'],
];
// Each element has the id `i` or not, occurs inside a `div` ancestor or not,
// and as its `::before` pseudo-element or not: every combination of the three.
/** @type {{id: boolean, inDiv: boolean, pseudo: boolean}[]} */
const flagSets = [false, true].flatMap((id) =>
  [false, true].flatMap((inDiv) =>
    [false, true].map((pseudo) => ({ id, inDiv, pseudo }))
  )
);
/** @type {Element[]} */
const elements = [];
for (const tag of ['div', 'span', 'p']) {
  for (const classes of classSets) {
    for (const { id, inDiv, pseudo } of flagSets) {
      const name = [
        inDiv ? 'div>' : '',
        tag,
        ...classes.map((className) => `.${className}`),
        id ? '#i' : '',
        pseudo ? '::before' : '',
      ].join('');
      elements.push({ tag, classes, id, inDiv, pseudo, name });
    }
  }
}

/**
 * An optional `div` ancestor, then a compound selector of an optional type,
 * classes and the id `i`, then an optional `::before`.
 *
 * @param {string} selector
 * @return {CompiledSelector}
 */
function compileSelector(selector) {
  const match =
    /^(?:(?<ancestor>div) )?(?<tag>[a-z]+)?(?<rest>(?:[.#][a-z]+)*)(?<pseudo>::before)?$/v.exec(
      selector
    );
  if (!match?.groups) {
    throw new Error(`selector outside the generated grammar: ${selector}`);
  }
  const { ancestor, tag, pseudo } = match.groups;
  const parts = [...match.groups.rest.matchAll(/[.#][a-z]+/gv)].map(
    ([part]) => part
  );
  const classes = parts
    .filter((part) => part[0] === '.')
    .map((part) => part.slice(1));
  const ids = parts
    .filter((part) => part[0] === '#')
    .map((part) => part.slice(1));
  return {
    matches: (element) =>
      (!tag || element.tag === tag) &&
      (!ancestor || element.inDiv) &&
      element.pseudo === Boolean(pseudo) &&
      classes.every((name) => element.classes.includes(name)) &&
      ids.every((name) => element.id && name === 'i'),
    specificity:
      ids.length * 10000 +
      classes.length * 100 +
      (tag ? 1 : 0) +
      (ancestor ? 1 : 0) +
      (pseudo ? 1 : 0),
  };
}

/**
 * The declarations that apply in `environment`, in source order, and the
 * layer names in the order they first appear.
 *
 * @param {string} css
 * @param {Environment} environment
 * @return {{declarations: CascadedDeclaration[], layers: string[]}}
 */
function collectCascade(css, environment) {
  /** @type {CascadedDeclaration[]} */
  const declarations = [];
  /** @type {string[]} */
  const layers = [];
  const declareLayer = (/** @type {string} */ name) => {
    if (!layers.includes(name)) layers.push(name);
  };
  /** @param {Container} container @param {string | null} layer */
  const visit = (container, layer) => {
    for (const node of /** @type {ChildNode[]} */ (container.nodes ?? [])) {
      if (node.type === 'rule') {
        const compiled = node.selectors.map(compileSelector);
        for (const child of node.nodes) {
          if (child.type !== 'decl') continue;
          declarations.push({
            selectors: compiled,
            prop: child.prop,
            value: child.value,
            important: child.important,
            layer,
            order: declarations.length,
          });
        }
      } else if (node.type === 'atrule') {
        const name = node.name.toLowerCase();
        if (name === 'layer' && !node.nodes) {
          for (const layerName of node.params.split(',')) {
            declareLayer(layerName.trim());
          }
        } else if (name === 'layer') {
          declareLayer(node.params);
          visit(node, node.params);
        } else if (name === 'media' && node.params === 'print') {
          if (environment.print) visit(node, layer);
        } else if (name === 'supports') {
          visit(node, layer);
        } else if (name !== 'font-face') {
          throw new Error(`at-rule outside the generated grammar: @${name}`);
        }
      }
    }
  };
  visit(postcss.parse(css), null);
  return { declarations, layers };
}

/**
 * The cascade sort key: origin importance, then layer, then specificity,
 * then source order. Unlayered normal declarations beat layered ones and
 * later layers beat earlier ones; important declarations reverse both.
 *
 * @param {CascadedDeclaration} declaration
 * @param {number} specificity
 * @param {string[]} layers
 * @return {number[]}
 */
function cascadeKey(declaration, specificity, layers) {
  const index =
    declaration.layer === null ? -1 : layers.indexOf(declaration.layer);
  const unlayered = index === -1;
  let layerRank = unlayered ? layers.length : index;
  if (declaration.important) layerRank = unlayered ? 0 : layers.length - index;
  return [
    declaration.important ? 1 : 0,
    layerRank,
    specificity,
    declaration.order,
  ];
}

/** @param {number[]} a @param {number[]} b */
function compareKeys(a, b) {
  for (const [i, value] of a.entries()) {
    if (value !== b[i]) return value - b[i];
  }
  return 0;
}

/**
 * @param {CascadedDeclaration} declaration
 * @param {'ltr' | 'rtl'} direction
 * @return {string[]}
 */
function slotsOf(declaration, direction) {
  if (declaration.prop.startsWith('--')) return [declaration.prop];
  const name = declaration.prop.toLowerCase();
  if (name === 'all') return resetByAll;
  const longhands = longhandsOf[name];
  if (!longhands)
    throw new Error(`property outside the generated grammar: ${name}`);
  return longhands(direction);
}

/**
 * The value of every longhand and custom property each element of the
 * generated element set ends up with. A logical property maps through the
 * element's own `direction`, which it inherits from `environment` unless a
 * valid declaration sets it.
 *
 * @param {string} css
 * @param {Environment} [environment]
 * @return {Map<string, Record<string, string>>}
 */
export function computedStyles(css, environment = {}) {
  const { declarations, layers } = collectCascade(css, environment);
  return new Map(
    elements.map((element) => {
      const applied = declarations
        .flatMap((declaration) => {
          const matching = declaration.selectors.filter((selector) =>
            selector.matches(element)
          );
          if (matching.length === 0) return [];
          const specificity = Math.max(
            ...matching.map((selector) => selector.specificity)
          );
          return [
            { declaration, key: cascadeKey(declaration, specificity, layers) },
          ];
        })
        .toSorted((a, b) => compareKeys(a.key, b.key))
        .map(({ declaration }) => declaration);
      let direction = environment.direction ?? 'ltr';
      for (const declaration of applied) {
        const value = declaration.value.toLowerCase();
        if (
          declaration.prop.toLowerCase() === 'direction' &&
          (value === 'ltr' || value === 'rtl')
        ) {
          direction = value;
        }
      }
      /** @type {Record<string, string>} */
      const style = {};
      for (const declaration of applied) {
        const value =
          declaration.prop.toLowerCase() === 'all'
            ? `all:${declaration.value}`
            : declaration.value;
        for (const slot of slotsOf(declaration, direction)) style[slot] = value;
      }
      return [element.name, style];
    })
  );
}
