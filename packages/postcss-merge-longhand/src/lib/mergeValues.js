import getValue from './getValue';

export default (...rules) => rules.map(getValue).join(' ');
