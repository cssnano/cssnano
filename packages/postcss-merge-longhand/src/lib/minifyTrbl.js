import * as R from 'ramda';
import parseTrbl from './parseTrbl';

const minifyTrbl = R.compose(
  (value) => {
    if (value[3] === value[1]) {
      value.pop();

      if (value[2] === value[0]) {
        value.pop();

        if (value[0] === value[1]) {
          value.pop();
        }
      }
    }

    return value.join(' ');
  },
  parseTrbl
);

export default minifyTrbl;
