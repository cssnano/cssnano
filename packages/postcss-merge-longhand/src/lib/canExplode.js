import isCustomProp from './isCustomProp';

const hasInherit = node => node.value.includes('inherit');
const hasInitial = node => node.value.includes('initial');
const hasUnset = node => node.value.includes('unset');

export default (prop, includeCustomProps = true) => {
    if (includeCustomProps && isCustomProp(prop)) {
        return false;
    }

    return !hasInherit(prop) && !hasInitial(prop) && !hasUnset(prop);
};
