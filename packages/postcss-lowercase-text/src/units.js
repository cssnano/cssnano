import valueParser from 'postcss-value-parser';

export const unitList = [
  // Relatives
  'em',
  'rem',
  'cap',
  'ch',
  'ic',
  'lh',
  'rlh',
  'vw',
  'vh',
  'vi',
  'vb',
  'vmin',
  'vmax',
  // absolute length
  'cm',
  'mm',
  'Q',
  'in',
  'pc',
  'pt',
  'px',
  // Angle units
  'deg',
  'grad',
  'rad',
  'turn',
  // Time units
  's',
  'ms',
  // Frequency units
  'hz',
  'khz',
  // Resolution unit
  'dpi',
  'dpcm',
  'dppx',
  'x',
];

export const unitSet = new Set(unitList);

const toLower = (unitObj) => {
  const { unit } = unitObj;
  if (unitSet.has(unit.toLowerCase())) {
    unitObj.unit = unit.toLowerCase();
  }
  return unitObj;
};

const transformer = (str) =>
  valueParser(str)
    .walk((node) => {
      if (node.type === 'word') {
        const unitObject =
          valueParser.unit(node.value) && toLower(valueParser.unit(node.value));
        if (unitObject) {
          const newValue = Object.keys(unitObject)
            .map((n) => unitObject[n])
            .join('');
          node.value = newValue;
        }
      }
      return node;
    })
    .toString();

export default transformer;
