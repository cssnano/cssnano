let important = node => node.important;
let unimportant = node => !node.important;
let hasInherit = node => ~node.value.indexOf('inherit');
let hasInitial = node => ~node.value.indexOf('initial');

export default (mergeInheritInitial, ...props) => {
    if (props.some(hasInherit) || props.some(hasInitial)) {
        if (mergeInheritInitial) {
            return props.every(hasInherit) || props.every(hasInitial);
        }
        return false;
    }
    return props.every(unimportant) || props.every(important);
};
