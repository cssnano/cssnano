import getLastNode from './getLastNode';

export default function getRules (props, properties) {
    return properties.map(property => {
        return getLastNode(props, property);
    }).filter(Boolean);
}
