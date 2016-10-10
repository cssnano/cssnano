export default function getDecls (rule, properties) {
    return rule.nodes.filter(({prop}) => prop && ~properties.indexOf(prop));
}
