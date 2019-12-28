import { unit } from 'postcss-value-parser';

const strValues = ['auto', 'inherit', 'unset', 'initial'];

export default (columns) => {
  let newValue = { front: '', back: '' };
  let shouldNormalize = false;
  columns.walk((node) => {
    const { type, value } = node;
    if (type === 'word' && strValues.indexOf(value.toLowerCase())) {
      const parsedVal = unit(value);
      if (parsedVal.unit !== '') {
        // surely its the column's width
        // it needs to be at the front
        newValue.front = `${newValue.front} ${value}`;
        shouldNormalize = true;
      }
    } else if (type === 'word') {
      newValue.back = `${newValue.back} ${value}`;
    }
    // console.log({ type, value });
  });
  if (shouldNormalize) {
    return `${newValue.front.trimStart()} ${newValue.back.trimStart()}`;
  }
  return columns;
};
