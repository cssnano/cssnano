import { tokenize, TokenType } from '@csstools/css-tokenizer';
/**
 * @param {{value: string}} node
 * @return {{number: string, unit: string} | false}
 */
function isNum(node) {
  const token = [...tokenize({ css: node.value })].find(
    (item) => item[0] !== TokenType.EOF
  );
  if (
    !token ||
    ![TokenType.Number, TokenType.Dimension, TokenType.Percentage].includes(
      token[0]
    )
  )
    return false;
  const metadata = /** @type {{value: number, unit?: string}} */ (token[4]);
  return {
    number: String(metadata.value),
    unit: metadata.unit ?? (token[0] === TokenType.Percentage ? '%' : ''),
  };
}

export default isNum;
