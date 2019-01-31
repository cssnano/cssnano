import isCustomProp from "./isCustomProp";

const hasInherit = node => node.value.toLowerCase().includes("inherit");
const hasInitial = node => node.value.toLowerCase().includes("initial");
const hasUnset = node => node.value.toLowerCase().includes("unset");

export default (prop, includeCustomProps = true) => {
    if (includeCustomProps && isCustomProp(prop)) {
        return false;
    }

    return !hasInherit(prop) && !hasInitial(prop) && !hasUnset(prop);
};
