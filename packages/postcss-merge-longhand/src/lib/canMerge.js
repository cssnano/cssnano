'use strict';

import {detect} from 'stylehacks';

let important = node => node.important;
let unimportant = node => !node.important;
let hasInherit = node => node.value && ~node.value.indexOf('inherit');

export default (...props) => {
    if (props.some(hasInherit)) {
        return false;
    }
    if (props.some(detect)) {
        return false;
    }
    return props.every(unimportant) || props.every(important);
};
