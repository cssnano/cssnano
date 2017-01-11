let important = node => node.important;
let unimportant = node => !node.important;
let hasInherit = node => ~node.value.indexOf('inherit');
let hasInitial = node => ~node.value.indexOf('initial');

export default (...props) => {
    if (props.some(hasInherit) || props.some(hasInitial)) {
        return false;
    }
    return props.every(unimportant) || props.every(important);
};
