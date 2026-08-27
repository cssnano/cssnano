const style = new Set(['italic', 'oblique']);
const variant = new Set(['small-caps']);
const weight = new Set([
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  'bold',
  'lighter',
  'bolder',
]);
const stretch = new Set([
  'ultra-condensed',
  'extra-condensed',
  'condensed',
  'semi-condensed',
  'semi-expanded',
  'expanded',
  'extra-expanded',
  'ultra-expanded',
]);
const size = new Set([
  'xx-small',
  'x-small',
  'small',
  'medium',
  'large',
  'x-large',
  'xx-large',
  'larger',
  'smaller',
]);
export default {
  style,
  variant,
  weight,
  stretch,
  size,
};
