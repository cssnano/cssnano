import getValue from './getValue.js';

export default (...rules) => rules.map(getValue).join(' ');
