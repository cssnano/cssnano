import { detect } from 'lerna:stylehacks';
import canMerge from '../canMerge';
import minifyTrbl from '../minifyTrbl';
import parseTrbl from '../parseTrbl';
import insertCloned from '../insertCloned';
import mergeRules from '../mergeRules';
import mergeValues from '../mergeValues';
import remove from '../remove';
import trbl from '../trbl';
import canExplode from '../canExplode';
import cleanupRule from '../cleanupRule';
import { formatPropsLeft } from '../formatProp';

export default (prop) => {
  const properties = formatPropsLeft(prop, trbl);

  const cleanup = cleanupRule(properties, prop);

  const processor = {
    explode: (rule) => {
      rule.walkDecls(new RegExp('^' + prop + '$', 'i'), (decl) => {
        if (!canExplode(decl)) {
          return;
        }

        if (detect(decl)) {
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
        if (canMerge(rules) && !rules.some(detect)) {
          insertCloned(lastNode.parent, lastNode, {
            prop,
            value: minifyTrbl(mergeValues(rules)),
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
