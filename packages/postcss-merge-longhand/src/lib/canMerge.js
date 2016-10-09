const important = node => node.important;
const unimportant = node => !node.important;
const hasInherit = node => node.value && ~node.value.indexOf('inherit');

export default (...props) => {
    if (props.some(hasInherit)) {
        return false;
    }
    return props.every(unimportant) || props.every(important);
};
