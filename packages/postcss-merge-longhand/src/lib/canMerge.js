let important = node => node.important;
let unimportant = node => !node.important;
let hasInherit = node => ~node.value.indexOf('inherit');
let hasInitial = node => ~node.value.indexOf('initial');

export default ( ...props) => {
    if (props.some(hasInherit) || props.some(hasInitial)) {
        return props.every(hasInherit) || props.every(hasInitial);
    }
    return props.every(unimportant) || props.every(important);
};
