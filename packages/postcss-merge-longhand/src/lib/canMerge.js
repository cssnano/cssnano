'use strict';

let important = node => node.important;
let unimportant = node => !node.important;

export default (...props) => props.every(important) || props.every(unimportant);
