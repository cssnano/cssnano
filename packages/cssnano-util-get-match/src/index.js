export default function getMatchFactory (map) {
    return function getMatch (args) {
        const match = args.reduce((list, arg, i) => {
            return list.filter(keyword => keyword[1][i] === arg);
        }, map);
        if (match.length) {
            return match[0][0];
        }
        return false;
    };
}
