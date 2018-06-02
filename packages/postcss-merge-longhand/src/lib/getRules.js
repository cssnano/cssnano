import {ruleContainsCustomPropertiesAndFallbacks, getRulesWithAndWithoutCustomProps, getAllRules} from './getLastNode';

export default function getRules (props, properties) {
    return ruleContainsCustomPropertiesAndFallbacks(props, properties) ?
        getRulesWithAndWithoutCustomProps(props, properties) :
        getAllRules(props, properties);   
}
