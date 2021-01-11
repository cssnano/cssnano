/* eslint-disable import/prefer-default-export */
export const pkgnameToVarName = (str) =>
  str
    .split('-')
    .map((u, i) =>
      i === 0 ? u : u.slice(0, 1).toUpperCase().concat(u.slice(1))
    )
    .join('');
