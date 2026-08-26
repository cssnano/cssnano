import getValue from './getValue.js';

/** @param {...import('postcss').Declaration} rules */
export default (...rules) => rules.map(getValue).join(' ');
