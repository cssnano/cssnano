import {ruleContainsCustomPropertiesAndFallbacks, getRulesWithAndWithoutCustomProps, getAllRules} from './utils';

export default function getRules (props, properties) {
    return ruleContainsCustomPropertiesAndFallbacks(props, properties) ?
        getRulesWithAndWithoutCustomProps(props, properties) :
        getAllRules(props, properties);   
}
