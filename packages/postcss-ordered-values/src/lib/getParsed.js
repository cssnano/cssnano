import valueParser from 'postcss-value-parser';

export default function getParsed (decl) {
    let {value, raws} = decl;
    if (raws && raws.value && raws.value.raw) {
        value = raws.value.raw;
    }
    return valueParser(value);
}
