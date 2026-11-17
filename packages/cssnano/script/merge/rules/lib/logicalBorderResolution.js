/**
 * Resolves flow-relative border declarations to the physical sides they set,
 * so that the border evaluator, which knows only physical sides, sees a
 * cascade that mixes the two. The oracle sets `horizontal-tb`, where the
 * block axis is vertical and `direction` picks the left and right sides.
 */

/** @typedef {{prop: string, value: string, important: boolean}} Declaration */

/**
 * @param {'ltr' | 'rtl'} direction
 * @return {Record<string, string>} flow-relative side → physical side
 */
function physicalSides(direction) {
  return {
    'block-start': 'top',
    'block-end': 'bottom',
    'inline-start': direction === 'rtl' ? 'right' : 'left',
    'inline-end': direction === 'rtl' ? 'left' : 'right',
  };
}

const axisSides = {
  block: ['block-start', 'block-end'],
  inline: ['inline-start', 'inline-end'],
};

/**
 * The declarations one declaration stands for. An axis component shorthand
 * takes one or two values, one for each side; any other count is invalid and
 * stays so on both sides.
 *
 * @param {Declaration} declaration
 * @param {Record<string, string>} sides
 * @return {Declaration[]}
 */
function resolveDeclaration(declaration, sides) {
  const { prop, value, important } = declaration;
  const match =
    /^border-(?:(?<side>block-start|block-end|inline-start|inline-end)|(?<axis>block|inline))(?:-(?<part>width|style|color))?$/v.exec(
      prop.toLowerCase()
    );
  if (!match?.groups) return [declaration];
  const { side, axis, part } = match.groups;
  const suffix = part ? `-${part}` : '';
  if (side) {
    return [{ prop: `border-${sides[side]}${suffix}`, value, important }];
  }
  const [start, end] = axisSides[/** @type {'block' | 'inline'} */ (axis)];
  const tokens = value.trim().split(/\s+/v);
  const values = part && tokens.length === 2 ? tokens : [value, value];
  return [start, end].map((name, index) => ({
    prop: `border-${sides[name]}${suffix}`,
    value: values[index],
    important,
  }));
}

/**
 * @param {Declaration[]} applied - in cascade order
 * @param {'ltr' | 'rtl'} direction
 * @return {Declaration[]}
 */
export function withPhysicalBorders(applied, direction) {
  const sides = physicalSides(direction);
  return applied.flatMap((declaration) =>
    resolveDeclaration(declaration, sides)
  );
}
