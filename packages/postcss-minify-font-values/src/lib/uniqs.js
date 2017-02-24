export default function uniqueExcept (exclude) {
    return function unique () {
        const list = Array.prototype.concat.apply([], arguments);
        return list.filter((item, i) => {
            if (item === exclude) {
                return true;
            }
            return i === list.indexOf(item);
        });
    };
};
