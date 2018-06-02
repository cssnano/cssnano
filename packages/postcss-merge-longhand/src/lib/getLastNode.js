function getRulesWithCustomProps (props, properties) {
    return properties.map(property => 
        props.filter(n => n.prop && ~n.prop.indexOf(property) && n.value && ~n.value.search(/var/i)).pop()
    ).filter(Boolean);
}

function getRulesWithoutCustomProps (props, properties) {
    return properties.map(property => 
        props.filter(n => n.prop && ~n.prop.indexOf(property) && n.value && !~n.value.search(/var/i)).pop()
    ).filter(Boolean);
}

export function ruleContainsCustomPropertiesAndFallbacks (props, properties) {
    return getRulesWithCustomProps(props, properties).length === getRulesWithoutCustomProps(props, properties).length;    
}

export function getAllRules (props, properties) {
    return new Array(
        properties.map(property => 
            props.filter(n => n.prop && ~n.prop.indexOf(property)).pop()
        ).filter(Boolean)
    );
}

export function getRulesWithAndWithoutCustomProps (props, properties) {
    return new Array(
        getRulesWithoutCustomProps(props, properties),
        getRulesWithCustomProps(props, properties)
    );
}
