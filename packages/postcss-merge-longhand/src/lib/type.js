import valueParser from 'postcss-value-parser';

export default ({value}) => {
    return valueParser(value).nodes[0].type;
};
