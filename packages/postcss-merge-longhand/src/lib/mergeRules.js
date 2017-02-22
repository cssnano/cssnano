import hasAllProps from './hasAllProps';
import getDecls from './getDecls';
import getRules from './getRules';

export default function mergeRules (rule, properties, callback) {
    let decls = getDecls(rule, properties);
    while (decls.length) {
        const last = decls[decls.length - 1];
        const props = decls.filter(node => node.important === last.important);
        const rules = getRules(props, properties);

        if (hasAllProps(rules, ...properties)) {
            if (callback(rules, last, props)) {
                decls = decls.filter(node => !~rules.indexOf(node));                
            }
        }
        decls = decls.filter(node => node !== last);
    }
}
