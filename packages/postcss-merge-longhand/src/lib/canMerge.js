import isCustomProp from './isCustomProp';

const important = node => node.important;
const unimportant = node => !node.important;

const hasInherit = node => node.value.includes('inherit');
const hasInitial = node => node.value.includes('initial');
const hasUnset = node => node.value.includes('unset');

export default (props, includeCustomProps = true) => {
    if (props.some(hasInherit) && !props.every(hasInherit)) {
        return false;
    }

    if (props.some(hasInitial) && !props.every(hasInitial)) {
        return false;
    }

    if (props.some(hasUnset) && !props.every(hasUnset)) {
        return false;
    }

    if (includeCustomProps && props.some(isCustomProp) && !props.every(isCustomProp)) {
        return false;
    }

    return props.every(unimportant) || props.every(important);
};
