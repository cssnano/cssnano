import colorNames from 'css-color-names';
import * as R from 'ramda';
import oneOf from './oneOf';

const widths = ['thin', 'medium', 'thick'];
const styles = [
  'none',
  'hidden',
  'dotted',
  'dashed',
  'solid',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
];

const colourKeywords = Object.keys(colorNames).concat([
  'transparent',
  'currentcolor',
]);

export const isStyle = oneOf(styles);

export const isWidth = R.either(
  oneOf(widths),
  R.test(/^(\d+(\.\d+)?|\.\d+)(\w+)?$/)
);

export const isColor = R.ifElse(
  R.isNil,
  R.F,
  R.anyPass([
    R.test(/rgba?\(/i),
    R.test(/hsla?\(/i),
    R.test(/#([0-9a-z]{6}|[0-9a-z]{3})/i),
    oneOf(colourKeywords),
  ])
);

export function isValidWsc(wscs) {
  const validWidth = isWidth(wscs[0]);
  const validStyle = isStyle(wscs[1]);
  const validColor = isColor(wscs[2]);

  return (
    (validWidth && validStyle) ||
    (validWidth && validColor) ||
    (validStyle && validColor)
  );
}
