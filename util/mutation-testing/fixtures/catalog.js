export const name = 'fixture';
export const target = 'file:///catalog-target.js';
export const mutations = [
  { name: 'inherits', find: 'a', replace: 'b' },
  { name: 'own', target: 'file:///own-target.js', find: 'a', replace: 'b' },
];
