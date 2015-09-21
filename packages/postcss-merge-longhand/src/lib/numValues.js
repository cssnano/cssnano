import {list} from 'postcss';

const space = list.space;

export default (...rules) => {
    return rules.reduce((memo, rule) => {
        memo += space(rule.value).length;
        return memo;
    }, 0);
};
