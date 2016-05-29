import clone from '../clone';
import insertCloned from '../insertCloned';
import {list} from 'postcss';
import parseTrbl from '../parseTrbl';
import hasAllProps from '../hasAllProps';
import getLastNode from '../getLastNode';
import minifyTrbl from '../minifyTrbl';
import canMerge from '../canMerge';
import remove from '../remove';
import trbl from '../trbl';

const wsc = ['width', 'style', 'color'];
const defaults = ['medium', 'none', 'currentColor'];
const directions = trbl.map(direction => `border-${direction}`);
const properties = wsc.map(property => `border-${property}`);

function getValue (node) {
    return node.value;
}

function isCloseEnough (mapped) {
    return (mapped[0] === mapped[1] && mapped[1] === mapped[2]) ||
           (mapped[1] === mapped[2] && mapped[2] === mapped[3]) ||
           (mapped[2] === mapped[3] && mapped[3] === mapped[0]) ||
           (mapped[3] === mapped[0] && mapped[0] === mapped[1]);
}

function explode (rule) {
    rule.walkDecls(/^border/, decl => {
        const {prop} = decl;
        // border -> border-trbl
        if (prop === 'border') {
            directions.forEach((direction) => {
                insertCloned(rule, decl, {prop: direction});
            });
            return decl.remove();
        }
        // border-trbl -> border-trbl-wsc
        if (trbl.some(direction => prop === `border-${direction}`)) {
            let values = list.space(decl.value);
            wsc.forEach((d, i) => {
                insertCloned(rule, decl, {
                    prop: `${prop}-${d}`,
                    value: values[i] !== undefined ? values[i] : defaults[i]
                });
            });
            return decl.remove();
        }
        // border-wsc -> border-trbl-wsc
        let property;
        if (wsc.some(style => {
            property = style;
            return prop === `border-${style}`;
        })) {
            let values = parseTrbl(decl.value);
            values.forEach((value, i) => {
                insertCloned(rule, decl, {
                    prop: `border-${trbl[i]}-${property}`,
                    value
                });
            });
            return decl.remove();
        }
    });
}

function merge (rule) {
    // border-trbl-wsc -> border-trbl
    trbl.forEach(direction => {
        let names = wsc.map(d => `border-${direction}-${d}`);
        let decls = rule.nodes.filter(node => node.prop && ~names.indexOf(node.prop));
        while (decls.length) {
            let lastNode = decls[decls.length - 1];
            let props = decls.filter(node => node.important === lastNode.important);
            let rules = names.map(prop => getLastNode(props, prop)).filter(Boolean);
            if (hasAllProps.apply(this, [rules].concat(names)) && canMerge.apply(this, rules)) {
                insertCloned(rule, lastNode, {
                    prop: `border-${direction}`,
                    value: rules.map(getValue).join(' ')
                });
                props.forEach(remove);
            }
            decls = decls.filter(node => !~rules.indexOf(node));
        }
    });
    // border-trbl-wsc -> border-wsc
    wsc.forEach(d => {
        let names = trbl.map(direction => `border-${direction}-${d}`);
        let decls = rule.nodes.filter(node => node.prop && ~names.indexOf(node.prop));
        while (decls.length) {
            let lastNode = decls[decls.length - 1];
            let props = decls.filter(node => node.important === lastNode.important);
            let rules = names.map(prop => getLastNode(props, prop)).filter(Boolean);
            if (hasAllProps.apply(this, [props].concat(names))) {
                insertCloned(rule, lastNode, {
                    prop: `border-${d}`,
                    value: minifyTrbl(rules.map(getValue).join(' '))
                });
                props.forEach(remove);
            }
            decls = decls.filter(node => !~rules.indexOf(node));
        }
    });

    // border-trbl -> border-wsc
    let decls = rule.nodes.filter(node => node.prop && ~directions.indexOf(node.prop));
    while (decls.length) {
        let lastNode = decls[decls.length - 1];
        let props = decls.filter(node => node.important === lastNode.important);
        let rules = directions.map(prop => getLastNode(props, prop)).filter(Boolean);
        if (hasAllProps.apply(this, [props].concat(directions))) {
            wsc.forEach((d, i) => {
                insertCloned(rule, lastNode, {
                    prop: `border-${d}`,
                    value: minifyTrbl(rules.map(node => list.space(node.value)[i]))
                });
            });
            props.forEach(remove);
        }
        decls = decls.filter(node => !~rules.indexOf(node));
    }

    // border-wsc -> border
    // border-wsc -> border + border-color
    // border-wsc -> border + border-dir
    decls = rule.nodes.filter(node => node.prop && ~properties.indexOf(node.prop));

    while (decls.length) {
        let lastNode = decls[decls.length - 1];
        let props = decls.filter(node => node.important === lastNode.important);
        if (hasAllProps.apply(this, [props].concat(properties))) {
            let width = getLastNode(props, properties[0]);
            let style = getLastNode(props, properties[1]);
            let color = getLastNode(props, properties[2]);

            if (hasAllProps.apply(this, [props].concat(properties))) {
                let rules = properties.map(prop => getLastNode(props, prop));
                let values = rules.map(node => parseTrbl(node.value));
                let mapped = [0, 1, 2, 3].map(i => [values[0][i], values[1][i], values[2][i]].join(' '));

                let reduced = mapped.reduce((a, b) => {
                    a = Array.isArray(a) ? a : [a];
                    if (!~a.indexOf(b)) {
                        a.push(b);
                    }
                    return a;
                });

                if (isCloseEnough(mapped) && canMerge.apply(this, rules)) {
                    let first = mapped.indexOf(reduced[0]) !== mapped.lastIndexOf(reduced[0]);

                    let border = insertCloned(rule, lastNode, {
                        prop: 'border',
                        value: first ? reduced[0] : reduced[1]
                    });

                    if (reduced[1]) {
                        let offValue = first ? reduced[1] : reduced[0];
                        let direction = trbl[mapped.indexOf(offValue)];

                        let offBorder = clone(lastNode);
                        offBorder.prop = `border-${direction}`;
                        offBorder.value = offValue;
                        rule.insertAfter(border, offBorder);
                    }
                    props.forEach(remove);
                } else if (reduced.length === 1) {
                    values = [width, style].map(getValue);
                    let decl = clone(lastNode);
                    decl.prop = `border`;
                    decl.value = values.join(' ');
                    rule.insertBefore(color, decl);
                    props.filter(node => node.prop !== properties[2]).forEach(remove);
                }
            }
        }
        decls = decls.filter(node => !~props.indexOf(node));
    }

    // optimize border-trbl
    decls = rule.nodes.filter(node => node.prop && ~directions.indexOf(node.prop));
    while (decls.length) {
        let lastNode = decls[decls.length - 1];
        wsc.forEach((d, i) => {
            let names = directions.filter(name => name !== lastNode.prop).map(name => `${name}-${d}`);
            let props = rule.nodes.filter(node => node.prop && ~names.indexOf(node.prop) && node.important === lastNode.important);
            if (hasAllProps.apply(this, [props].concat(names))) {
                let values = directions.map(prop => getLastNode(props, `${prop}-${d}`)).map(node => node ? node.value : null);
                let filteredValues = values.filter(Boolean);
                let lastNodeValue = list.space(lastNode.value)[i];
                values[directions.indexOf(lastNode.prop)] = lastNodeValue;
                let value = minifyTrbl(values.join(' '));
                if (
                    filteredValues[0] === filteredValues[1] &&
                    filteredValues[1] === filteredValues[2]
                ) {
                    value = filteredValues[0];
                }
                let refNode = props[props.length-1];
                if (value === lastNodeValue) {
                    refNode = lastNode;
                    let valueArray = list.space(lastNode.value);
                    valueArray.splice(i, 1);
                    lastNode.value = valueArray.join(' ');
                }
                insertCloned(rule, refNode, {
                    prop: `border-${d}`,
                    value: value
                });
                props.forEach(remove);
            }
        });
        decls = decls.filter(node => node !== lastNode);
    }

    rule.walkDecls('border', decl => {
        const next = decl.next();
        if (!next || next.type !== 'decl') {
            return;
        }
        const index = directions.indexOf(next.prop);
        if (!~index) {
            return;
        }
        let values = list.space(decl.value);
        let dirValues = list.space(next.value);

        if (
            values[0] === dirValues[0] &&
            values[1] === dirValues[1] &&
            values[2] && dirValues[2]
        ) {
            let colors = parseTrbl(values[2]);
            colors[index] = dirValues[2];
            values.pop();
            let borderValue = values.join(' ');
            let colorValue = minifyTrbl(colors);

            let origLength = (decl.value + next.prop + next.value).length;
            let newLength = borderValue.length + 12 + colorValue.length;

            if (newLength < origLength) {
                decl.value = borderValue;
                next.prop = `border-color`;
                next.value = colorValue;
            }
        }
    });

    // clean-up values
    rule.walkDecls(/^border(-(top|right|bottom|left))?/, decl => {
        decl.value = list.space(decl.value).concat(['']).reduceRight((prev, cur, i) => {
            if (prev === '' && cur === defaults[i]) {
                return prev;
            }
            return cur + ' ' + prev;
        }).trim() || defaults[0];
        if (wsc.some(style => ~decl.prop.indexOf(style))) {
            decl.value = minifyTrbl(decl.value);
        }
    });
}

export default {
    explode,
    merge,
};
