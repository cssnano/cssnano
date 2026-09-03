import cssnanoUtils from 'cssnano-utils';

const { TokenType, numeric, tokens } = cssnanoUtils;
/**
 * @param {{value: string}} node
 * @return {{number: string, unit: string} | false}
 */
function isNum(node) {
  const token = tokens(node.value)[0];
  if (
    !token ||
    ![TokenType.Number, TokenType.Dimension, TokenType.Percentage].includes(
      token[0]
    )
  )
    return false;
  const metadata = numeric(token);
  if (!metadata) return false;
  return {
    number: String(metadata.number),
    unit: metadata.unit,
  };
}

export default isNum;
