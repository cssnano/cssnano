export default function(value) {
  const valueInLowerCase = value.toLowerCase();

  return valueInLowerCase === 'normal'
    ? '400'
    : valueInLowerCase === 'bold'
    ? '700'
    : value;
}
