/**
 * A webref shaped stand-in holding just enough of the border, margin and
 * columns families.
 *
 * @param {Partial<Parameters<typeof import('../lib/webrefLonghands.js').buildLonghands>[0]>} [overrides]
 */
export function webref(overrides = {}) {
  /** @type {Parameters<typeof import('../lib/webrefLonghands.js').buildLonghands>[0]['properties']} */
  const properties = [
    {
      name: 'all',
      /* `revert-rule` is a css-cascade draft no engine implements. */
      syntax: 'initial | inherit | unset | revert | revert-layer | revert-rule',
    },
    {
      name: 'border',
      longhands: ['border-width', 'border-style', 'border-color'],
      resetLonghands: ['border-image'],
      initial: 'see individual properties',
    },
    { name: 'border-image', longhands: ['border-image-source'] },
    { name: 'border-image-source', initial: 'none' },
  ];

  for (const component of ['width', 'style', 'color']) {
    properties.push({
      name: `border-${component}`,
      longhands: ['top', 'right', 'bottom', 'left'].map(
        (side) => `border-${side}-${component}`
      ),
      initial: 'see individual properties',
    });
  }

  for (const side of ['top', 'right', 'bottom', 'left']) {
    properties.push({
      name: `border-${side}`,
      longhands: ['width', 'style', 'color'].map(
        (component) => `border-${side}-${component}`
      ),
    });

    for (const [component, initial] of [
      ['width', 'medium'],
      ['style', 'none'],
      ['color', 'currentcolor'],
    ]) {
      properties.push({
        name: `border-${side}-${component}`,
        initial,
        logicalPropertyGroup: `border-${component}`,
      });
    }

    properties.push({
      name: `border-${side}-radius`,
      initial: '0',
      logicalPropertyGroup: 'border-radius',
    });
  }

  for (const name of ['margin', 'padding']) {
    properties.push({
      name,
      longhands: ['top', 'right', 'bottom', 'left'].map(
        (side) => `${name}-${side}`
      ),
      initial: '0',
    });

    for (const side of ['top', 'right', 'bottom', 'left']) {
      properties.push({ name: `${name}-${side}`, initial: '0' });
    }
  }

  properties.push(
    {
      name: 'columns',
      longhands: ['column-width', 'column-count', 'column-height'],
    },
    { name: 'column-width', initial: 'auto' },
    { name: 'column-count', initial: 'auto' },
    { name: 'column-height', initial: 'auto' },
    {
      name: 'border-inline-start-width',
      initial: 'medium',
      logicalPropertyGroup: 'border-width',
    },
    {
      name: 'border-start-start-radius',
      initial: '0',
      logicalPropertyGroup: 'border-radius',
    }
  );

  return {
    properties,
    types: [
      { name: 'line-style', syntax: 'none | hidden | dotted | dashed | solid' },
      {
        name: 'line-width',
        syntax: '<length [0,∞]> | hairline | thin | medium | thick',
      },
      {
        name: 'named-color',
        /* The real list runs to about 150 names, which `validate` expects. */
        syntax: ['red', 'rebeccapurple', 'transparent']
          .concat(Array.from({ length: 140 }, (_, i) => `stand-in-colour-${i}`))
          .join(' | '),
      },
      { name: 'color', syntax: '<color-base> | currentColor' },
      {
        name: 'color-base',
        syntax: '<color-function> | <color-mix()> | <light-dark-color>',
      },
      { name: 'light-dark-color', syntax: 'light-dark(<color>, <color>)' },
      {
        name: 'color-function',
        syntax:
          '<rgb()> | <rgba()> | <hsl()> | <hsla()> | <hwb()> | <lab()> | <lch()> | <oklab()> | <oklch()> | <color()> | <hdr-color()> | <alpha()>',
      },
      /* Listed among the colour functions, though what it specifies is the
       * alpha of a colour rather than a colour, as css-color-hdr writes it. */
      { name: 'alpha()', syntax: 'alpha( [from <color>]? )' },
    ],
    functions: [
      { name: 'color-mix()', syntax: 'color-mix( <color># )' },
      /* Named one thing and called another, as css-color-hdr writes it. */
      { name: 'hdr-color()', syntax: 'color-hdr( <color># )' },
    ],
    ...overrides,
  };
}
