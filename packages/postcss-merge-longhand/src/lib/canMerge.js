import isCustomProp from './isCustomProp';

const important = node => node.important;
const unimportant = node => !node.important;
const hasInherit = node => ~node.value.indexOf('inherit');
const hasInitial = node => ~node.value.indexOf('initial');

export default (...props) => {
    if (props.some(hasInherit) || props.some(hasInitial) || props.some(isCustomProp)) {
        return props.every(hasInherit) || props.every(hasInitial) || props.every(isCustomProp);
    }
    return props.every(unimportant) || props.every(important);
};
