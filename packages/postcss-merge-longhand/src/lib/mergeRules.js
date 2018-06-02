import hasAllProps from './hasAllProps';
import getDecls from './getDecls';
import getRules from './getRules';

export default function mergeRules (rule, properties, callback) {
    let decls = getDecls(rule, properties);
    while (decls.length) {
        let last = decls[decls.length - 1];
        const props = decls.filter(node => node.important === last.important);
        const rulesSet = getRules(props, properties);
        rulesSet.forEach((rules, index) => {
            if (hasAllProps(rules, ...properties)) {
                if (callback(rules, last, props)) {
                    decls = decls.filter(node => !~rules.indexOf(node));
                    if (rulesSet[index + 1]) {
                        last = rulesSet[index + 1][rulesSet[index + 1].length - 1];
                    }
                }
            } 
        });
        decls = decls.filter(node => node !== last);
    }
}
