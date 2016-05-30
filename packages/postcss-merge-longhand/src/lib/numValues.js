import {list} from 'postcss';
const {space} = list;

export default (...rules) => {
    return rules.reduce((memo, rule) => memo += space(rule.value).length, 0);
};
