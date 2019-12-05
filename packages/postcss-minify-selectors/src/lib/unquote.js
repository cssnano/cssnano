// quoteMark is default to `"` as assuming default outer quotes will be `"`
export default (string, quoteMark = '"') =>
  string.replace(new RegExp(`[${quoteMark}]`, 'g'), '');
