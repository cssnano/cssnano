export default (rule, prop) => {
    return rule.filter(n => n.prop && n.prop.toLowerCase() === prop).pop();
};
