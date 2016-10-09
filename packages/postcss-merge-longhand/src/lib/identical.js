export default (...rules) => {
    const candidate = rules[0].value;
    return rules.every(({value}) => value === candidate);
};
