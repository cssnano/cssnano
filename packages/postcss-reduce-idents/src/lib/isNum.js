import {unit} from "postcss-value-parser";

export default function isNum (node) {
    return unit(node.value);
}
