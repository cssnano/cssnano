/* jshint loopfunc:true */

let clone = (obj, parent) => {
    if (typeof obj !== 'object') {
        return obj;
    }
    let cloned = new obj.constructor();
    for (let i in obj) {
        if (!({}.hasOwnProperty.call(obj, i))) {
            continue;
        }
        let value = obj[i];
        if (i === 'parent' && typeof value === 'object') {
            if (parent) {
                cloned[i] = parent;
            }
        } else if (i === 'source') {
            cloned[i] = value;
        } else if (value instanceof Array) {
            cloned[i] = value.map(j => clone(j, cloned));
        } else {
            cloned[i] = clone(value, cloned);
        }
    }
    return cloned;
};

export default clone;
