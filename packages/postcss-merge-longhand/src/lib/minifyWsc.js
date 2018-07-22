import parseWsc from './parseWsc';
import minifyTrbl from './minifyTrbl';
import {isValidWsc} from './validateWsc';

const defaults = ['medium', 'none', 'currentColor'];

export default v => {
    const values = parseWsc(v);
    if (!isValidWsc(values)) {
        return minifyTrbl(v);
    }

    const value = [...values, ''].reduceRight((prev, cur, i, arr) => {
        if (cur === undefined || cur === defaults[i] && arr[i-1] !== cur) {
            return prev;
        }
        return cur + ' ' + prev;
    }).trim();
    return minifyTrbl(value || defaults[0]);
};
