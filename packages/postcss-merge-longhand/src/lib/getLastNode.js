export default (rule, prop) => {
    return rule.filter(n => n.prop && n.prop === prop).pop();
};
