import postcss from 'postcss';
import valueParser from 'postcss-value-parser';

function getValues ({value}, index) {
    if (index % 2 === 0) {
        return parseFloat(value);
    }
    return value;
}

function reduce (node) {
    const {nodes, type, value} = node;
    if (type !== 'function') {
        return false;
    }
    const floats = nodes.map(getValues);
    const [first,, second,, third] = floats;
    // matrix3d(a, b, 0, 0, c, d, 0, 0, 0, 0, 1, 0, tx, ty, 0, 1) => matrix(a, b, c, d, tx, ty)
    if (value === 'matrix3d') {
        if (
            nodes[30]        &&
            third      === 0 && // 3
            floats[6]  === 0 && // 4
            floats[12] === 0 && // 7
            floats[14] === 0 && // 8
            floats[16] === 0 && // 9
            floats[18] === 0 && // 10
            floats[20] === 1 && // 11
            floats[22] === 0 && // 12
            floats[28] === 0 && // 15
            floats[30] === 1    // 16
        ) {
            node.value = 'matrix';
            node.nodes = [
                nodes[0],       // 1
                nodes[1],       // ,
                nodes[2],       // 2
                nodes[3],       // ,
                nodes[8],       // 5
                nodes[9],       // ,
                nodes[10],      // 6
                nodes[11],      // ,
                nodes[24],      // 13
                nodes[25],      // ,
                nodes[26],      // 14
            ];
        }
        return false;
    }
    if (value === 'rotate3d') {
        if (nodes[6]) {
            // rotate3d(0, 1, 0, a) => rotateY(a)
            if (first === 1 && second === 0 && third === 0) {
                node.value = 'rotateX';
                node.nodes = [nodes[6]];
                return false;
            }
            // rotate3d(0, 1, 0, a) => rotateY(a)
            if (first === 0 && second === 1 && third === 0) {
                node.value = 'rotateY';
                node.nodes = [nodes[6]];
                return false;
            }
            // rotate3d(0, 0, 1, a) => rotate(a) (or rotateZ(a))
            if (first === 0 && second === 0 && third === 1) {
                node.value = 'rotate';
                node.nodes = [nodes[6]];
                return false;
            }
        }
        return false;
    }
    // rotateZ(rz) => rotate(rz)
    if (value === 'rotateZ') {
        node.value = 'rotate';
        return false;
    }
    if (value === 'scale' || value === 'translate') {
        if (value === 'scale' && nodes[2]) {
            // scale(sx, sy) => scale(sx)
            if (first === second) {
                node.nodes = [nodes[0]];
                return false;
            }
            // scale(sx, 1) => scaleX(sx)
            if (second === 1) {
                node.value = 'scaleX';
                node.nodes = [nodes[0]];
                return false;
            }
            // scale(1, sy) => scaleY(sy)
            if (first === 1) {
                node.value = 'scaleY';
                node.nodes = [nodes[2]];
                return false;
            }
            return false;
        }
        if (value === 'translate' && nodes[2]) {
            // translate(tx, 0) => translate(tx)
            if (second === 0) {
                node.nodes = [nodes[0]];
                return false;
            }
            // translate(0, ty) => translateY(ty)
            if (first === 0) {
                node.value = 'translateY';
                node.nodes = [nodes[2]];
                return false;
            }
            return false;
        }
        return false;
    }
    if (value === 'scale3d') {
        if (third) {
            // scale3d(sx, 1, 1) => scaleX(sx)
            if (second === 1 && third === 1) {
                node.value = 'scaleX';
                node.nodes = [nodes[0]];
                return false;
            }
            // scale3d(1, sy, 1) => scaleY(sy)
            if (first === 1 && third === 1) {
                node.value = 'scaleY';
                node.nodes = [nodes[2]];
                return false;
            }
            // scale3d(1, 1, sz) => scaleZ(sz)
            if (first === 1 && second === 1) {
                node.value = 'scaleZ';
                node.nodes = [nodes[4]];
                return false;
            }
        }
        return false;
    }
    // translate3d(0, 0, tz) => translateZ(tz)
    if (
        value === 'translate3d' &&
        nodes[4]                &&
        first  === 0            &&
        second === 0
    ) {
        node.value = 'translateZ';
        node.nodes = [nodes[4]];
    }
    return false;
}

export default postcss.plugin('postcss-reduce-transforms', () => {
    return css => {
        css.walkDecls(/transform$/, decl => {
            decl.value = valueParser(decl.value).walk(reduce).toString();
        });
    };
});
