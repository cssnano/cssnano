'use strict';
const stylehacks = require('stylehacks');
const canMerge = require('../canMerge');
const getDecls = require('../getDecls');
const minifyTrbl = require('../minifyTrbl');
const parseTrbl = require('../parseTrbl');
const insertCloned = require('../insertCloned');
const mergeRules = require('../mergeRules');
const mergeValues = require('../mergeValues');
const remove = require('../remove');
const trbl = require('../trbl');
const isCustomProp = require('../isCustomProp');
const canExplode = require('../canExplode');

module.exports = (prop) => {
  const properties = trbl.map((direction) => `${prop}-${direction}`);

  const cleanup = (rule) => {
    let decls = getDecls(rule, [prop].concat(properties));

    while (decls.length) {
      const lastNode = decls[decls.length - 1];

      // remove properties of lower precedence
      const lesser = decls.filter(
        (node) =>
          !stylehacks.detect(lastNode) &&
          !stylehacks.detect(node) &&
          node !== lastNode &&
          node.important === lastNode.important &&
          lastNode.prop === prop &&
          node.prop !== lastNode.prop
      );

      lesser.forEach(remove);
      decls = decls.filter((node) => !lesser.includes(node));

      // get duplicate properties
      let duplicates = decls.filter(
        (node) =>
          !stylehacks.detect(lastNode) &&
          !stylehacks.detect(node) &&
          node !== lastNode &&
          node.important === lastNode.important &&
          node.prop === lastNode.prop &&
          !(!isCustomProp(node) && isCustomProp(lastNode))
      );

      duplicates.forEach(remove);
      decls = decls.filter(
        (node) => node !== lastNode && !duplicates.includes(node)
      );
    }
  };

  const processor = {
    explode: (rule) => {
      rule.walkDecls(new RegExp('^' + prop + '$', 'i'), (decl) => {
        if (!canExplode(decl)) {
          return;
        }

        if (stylehacks.detect(decl)) {
          return;
        }

        const values = parseTrbl(decl.value);

        trbl.forEach((direction, index) => {
          insertCloned(decl.parent, decl, {
            prop: properties[index],
            value: values[index],
          });
        });

        decl.remove();
      });
    },
    merge: (rule) => {
      mergeRules(rule, properties, (rules, lastNode) => {
        if (canMerge(rules) && !rules.some(stylehacks.detect)) {
          insertCloned(lastNode.parent, lastNode, {
            prop,
            value: minifyTrbl(mergeValues(...rules)),
          });
          rules.forEach(remove);

          return true;
        }
      });

      cleanup(rule);
    },
  };

  return processor;
};
