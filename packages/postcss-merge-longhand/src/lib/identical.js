export default (...rules) => {
    let candidate = rules[0].value;
    return rules.every(({value}) => value === candidate);
};
