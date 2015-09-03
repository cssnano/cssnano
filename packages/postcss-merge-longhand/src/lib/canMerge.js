'use strict';

let important = node => node.important;
let unimportant = node => !node.important;
let hasInherit = node => node.value && ~node.value.indexOf('inherit');

export default (...props) => {
    if (props.some(hasInherit)) {
        return false;
    }
    return props.every(important) || props.every(unimportant);
};
