import isCustomProp from './isCustomProp';

const isInherit = node => ~node.value.indexOf('inherit');
const isInitial = node => ~node.value.indexOf('initial');

export default prop => !isInherit(prop) && !isInitial(prop) && !isCustomProp(prop);
