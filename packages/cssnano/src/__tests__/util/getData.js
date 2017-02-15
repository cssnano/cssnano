export default function getData (mappings) {
    return mappings.reduce((list, mapping) => {
        list[mapping[0]] = mapping[1].join(' ');
        return list;
    }, {});
}
