import cssnanoUtils from 'cssnano-utils';

const { asciiLowerCase } = cssnanoUtils;

/** @param {string} value */
const minifyWeight = function (value) {
  const lowerCasedValue = asciiLowerCase(value);

  if (lowerCasedValue === 'normal') {
    return '400';
  } else {
    return lowerCasedValue === 'bold' ? '700' : value;
  }
};

export default minifyWeight;
