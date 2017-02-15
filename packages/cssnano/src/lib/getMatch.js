export default function getMatchFactory (mappings) {
    return function getMatch (args) {
        return args.reduce((list, arg, i) => {
            return list.filter(keyword => keyword[1][i] === arg);
        }, mappings);
    };
}
