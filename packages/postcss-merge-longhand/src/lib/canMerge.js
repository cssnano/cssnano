import isCustomProp from './isCustomProp';

const important = node => node.important;
const unimportant = node => !node.important;

const hasInherit = node => node.value.toLowerCase() === 'inherit';
const hasInitial = node => node.value.toLowerCase() === 'initial';
const hasUnset = node => node.value.toLowerCase() === 'unset';

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
