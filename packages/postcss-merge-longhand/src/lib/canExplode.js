import isCustomProp from './isCustomProp';

const isInherit = node => ~node.value.indexOf('inherit');
const isInitial = node => ~node.value.indexOf('initial');

export default (prop, includeCustomProps = true) => {
    if (includeCustomProps && isCustomProp(prop)) {
        return false;
    }

    return !isInherit(prop) && !isInitial(prop);
};
