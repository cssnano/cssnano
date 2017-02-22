import {list} from 'postcss';
import {detect} from 'stylehacks';
import assign from 'object-assign';
import clone from '../clone';
import insertCloned from '../insertCloned';
import parseTrbl from '../parseTrbl';
import hasAllProps from '../hasAllProps';
import getDecls from '../getDecls';
import getRules from '../getRules';
import getValue from '../getValue';
import mergeRules from '../mergeRules';
import minifyTrbl from '../minifyTrbl';
import canMerge from '../canMerge';
import remove from '../remove';
import trbl from '../trbl';

const wsc = ['width', 'style', 'color'];
const defaults = ['medium', 'none', 'currentColor'];

function borderProperty (...parts) {
    return `border-${parts.join('-')}`;
}

function mapBorderProperty (value) {
    return borderProperty(value);
}

const directions = trbl.map(mapBorderProperty);
const properties = wsc.map(mapBorderProperty);
const directionalProperties = directions.reduce(
    (prev, curr) => prev.concat(wsc.map(prop => `${curr}-${prop}`)), []);

const precedence = [
    ['border'],
    directions.concat(properties),
    directionalProperties,
];

const allProperties = precedence.reduce((a, b) => a.concat(b));

function getLevel (prop) {
    for (let i = 0; i < precedence.length; i++) {
        if (!!~precedence[i].indexOf(prop)) {
            return i;
        }
    }
}

function getColorValue (decl) {
    let values = list.space(decl.value);

    if (decl.prop === 'border') { 
        return values[2]; 
    }

    if (!!~directions.indexOf(decl.prop)) { 
        return values[2]; 
    }
    
    if (decl.prop.substr(-5) === 'color') {
        return decl.value;
    }

    return null;
}

function mergeRedundant ({values, nextValues, decl, nextDecl, index, position, prop}) {
    if (detect(decl) || detect(nextDecl)) {
        return;
    }
    let props = parseTrbl(values[position]);
    props[index] = nextValues[position];
    values.splice(position, 1);
    let borderValue = values.join(' ');
    let propertyValue = minifyTrbl(props);

    let origLength = (decl.value + nextDecl.prop + nextDecl.value).length;
    let newLength = borderValue.length + 12 + propertyValue.length;

    if (newLength < origLength) {
        decl.value = borderValue;
        nextDecl.prop = prop;
        nextDecl.value = propertyValue;
    }
}

function isCloseEnough (mapped) {
    return (mapped[0] === mapped[1] && mapped[1] === mapped[2]) ||
           (mapped[1] === mapped[2] && mapped[2] === mapped[3]) ||
           (mapped[2] === mapped[3] && mapped[3] === mapped[0]) ||
           (mapped[3] === mapped[0] && mapped[0] === mapped[1]);
}

function getDistinctShorthands (mapped) {
    return mapped.reduce((a, b) => {
        a = Array.isArray(a) ? a : [a];
        if (!~a.indexOf(b)) {
            a.push(b);
        }
        return a;
    });
}

function explode (rule) {
    rule.walkDecls(/^border/, decl => {
        // Don't explode inherit values as they cannot be merged together
        if (decl.value === 'inherit') {
            return;
        }

        if (detect(decl)) {
            return;
        }

        const {prop} = decl;
        // border -> border-trbl
        if (prop === 'border') {
            directions.forEach((direction) => {
                insertCloned(rule, decl, {prop: direction});
            });
            return decl.remove();
        }
        // border-trbl -> border-trbl-wsc
        if (directions.some(direction => prop === direction)) {
            let values = list.space(decl.value);
            wsc.forEach((d, i) => {
                insertCloned(rule, decl, {
                    prop: `${prop}-${d}`,
                    value: values[i] || defaults[i],
                });
            });
            return decl.remove();
        }
        // border-wsc -> border-trbl-wsc
        wsc.some(style => {
            if (prop !== borderProperty(style)) {
                return false;
            }
            parseTrbl(decl.value).forEach((value, i) => {
                insertCloned(rule, decl, {
                    prop: borderProperty(trbl[i], style),
                    value,
                });
            });
            return decl.remove();
        });
    });
}

function merge (rule) {
    // border-trbl-wsc -> border-trbl
    trbl.forEach(direction => {
        const prop = borderProperty(direction);
        mergeRules(
            rule, 
            wsc.map(style => borderProperty(direction, style)),
            (rules, lastNode) => {
                if (canMerge(...rules) && !rules.some(detect)) {
                    insertCloned(rule, lastNode, {
                        prop,
                        value: rules.map(getValue).join(' '),
                    });
                    rules.forEach(remove);
                    return true;
                }
            }
        );
    });

    // border-trbl-wsc -> border-wsc
    wsc.forEach(style => {
        const prop = borderProperty(style);
        mergeRules(
            rule, 
            trbl.map(direction => borderProperty(direction, style)),
            (rules, lastNode) => {
                if (!rules.some(detect)) {
                    insertCloned(rule, lastNode, {
                        prop,
                        value: minifyTrbl(rules.map(getValue).join(' ')),
                    });
                    rules.forEach(remove);
                    return true;
                }
            }
        );
    });

    // border-trbl -> border-wsc
    mergeRules(rule, directions, (rules, lastNode) => {
        if (rules.some(detect)) {
            return;
        }
        wsc.forEach((d, i) => {
            insertCloned(rule, lastNode, {
                prop: borderProperty(d),
                value: minifyTrbl(rules.map(node => list.space(node.value)[i])),
            });
        });
        rules.forEach(remove);
        return true;
    });

    // border-wsc -> border
    // border-wsc -> border + border-color
    // border-wsc -> border + border-dir
    mergeRules(rule, properties, (rules, lastNode) => {
        if (rules.some(detect)) {
            return;
        }
        const [width, style, color] = rules;
        const values = rules.map(node => parseTrbl(node.value));
        const mapped = [0, 1, 2, 3].map(i => [values[0][i], values[1][i], values[2][i]].join(' '));
        const reduced = getDistinctShorthands(mapped);

        if (isCloseEnough(mapped) && canMerge(...rules)) {
            const first = mapped.indexOf(reduced[0]) !== mapped.lastIndexOf(reduced[0]);

            const border = insertCloned(rule, lastNode, {
                prop: 'border',
                value: first ? reduced[0] : reduced[1],
            });

            if (reduced[1]) {
                const value = first ? reduced[1] : reduced[0];
                const prop = borderProperty(trbl[mapped.indexOf(value)]);

                rule.insertAfter(border, assign(clone(lastNode), {
                    prop,
                    value,
                }));
            }
            rules.forEach(remove);
            return true;
        } else if (reduced.length === 1) {
            rule.insertBefore(color, assign(clone(lastNode), {
                prop: 'border',
                value: [width, style].map(getValue).join(' '),
            }));
            rules.filter(node => node.prop !== properties[2]).forEach(remove);
            return true;
        }
    });

    // border-wsc -> border + border-trbl
    mergeRules(rule, properties, (rules, lastNode) => {
        if (rules.some(detect)) {
            return;
        }
        const values = rules.map(node => parseTrbl(node.value));
        const mapped = [0, 1, 2, 3].map(i => [values[0][i], values[1][i], values[2][i]].join(' '));
        const reduced = getDistinctShorthands(mapped);
        const none = 'none none currentColor';

        if (reduced.length === 2 && reduced[0] === none || reduced[1] === none) {
            const noOfNones = mapped.filter(value => value === none).length;
            rule.insertBefore(lastNode, assign(clone(lastNode), {
                prop: 'border',
                value: noOfNones > 2 ? 'none' : mapped.filter(value => value !== none)[0],
            }));
            directions.forEach((dir, i) => {
                if (noOfNones > 2 && mapped[i] !== none) {
                    rule.insertBefore(lastNode, assign(clone(lastNode), {
                        prop: dir,
                        value: mapped[i],
                    }));
                }
                if (noOfNones <= 2 && mapped[i] === none) {
                    rule.insertBefore(lastNode, assign(clone(lastNode), {
                        prop: dir,
                        value: 'none',
                    }));
                }
            });
            rules.forEach(remove);
            return true;
        }
    });

    // optimize border-trbl
    let decls = getDecls(rule, directions);
    while (decls.length) {
        const lastNode = decls[decls.length - 1];
        wsc.forEach((d, i) => {
            const names = directions.filter(name => name !== lastNode.prop).map(name => `${name}-${d}`);
            const props = rule.nodes.filter(node => node.prop && ~names.indexOf(node.prop) && node.important === lastNode.important);
            const rules = getRules(props, names);
            if (hasAllProps(rules, ...names) && !rules.some(detect)) {
                const values = rules.map(node => node ? node.value : null);
                const filteredValues = values.filter(Boolean);
                const lastNodeValue = list.space(lastNode.value)[i];
                values[directions.indexOf(lastNode.prop)] = lastNodeValue;
                let value = minifyTrbl(values.join(' '));
                if (
                    filteredValues[0] === filteredValues[1] &&
                    filteredValues[1] === filteredValues[2]
                ) {
                    value = filteredValues[0];
                }
                let refNode = props[props.length - 1];
                if (value === lastNodeValue) {
                    refNode = lastNode;
                    let valueArray = list.space(lastNode.value);
                    valueArray.splice(i, 1);
                    lastNode.value = valueArray.join(' ');
                }
                insertCloned(rule, refNode, {
                    prop: borderProperty(d),
                    value,
                });
                decls = decls.filter(node => !~rules.indexOf(node));
                rules.forEach(remove);
            }
        });
        decls = decls.filter(node => node !== lastNode);
    }

    rule.walkDecls('border', decl => {
        const nextDecl = decl.next();
        if (!nextDecl || nextDecl.type !== 'decl') {
            return;
        }
        const index = directions.indexOf(nextDecl.prop);
        if (!~index) {
            return;
        }
        const values = list.space(decl.value);
        const nextValues = list.space(nextDecl.value);

        const config = {
            values,
            nextValues,
            decl,
            nextDecl,
            index,
        };

        if (
            values[0] === nextValues[0] &&
            values[2] === nextValues[2]
        ) {
            return mergeRedundant({
                ...config,
                position: 1,
                prop: 'border-style',
            });
        }

        if (
            values[1] === nextValues[1] &&
            values[2] === nextValues[2]
        ) {
            return mergeRedundant({
                ...config,
                position: 0,
                prop: 'border-width',
            });
        }

        if (
            values[0] === nextValues[0] &&
            values[1] === nextValues[1] &&
            values[2] && nextValues[2]
        ) {
            return mergeRedundant({
                ...config,
                position: 2,
                prop: 'border-color',
            });
        }
    });

    // clean-up values
    rule.walkDecls(/^border($|-(top|right|bottom|left))/, decl => {
        const value = [...list.space(decl.value), ''].reduceRight((prev, cur, i) => {
            if (prev === '' && cur === defaults[i]) {
                return prev;
            }
            return cur + ' ' + prev;
        }).trim() || defaults[0];
        decl.value = minifyTrbl(value);
    });

    // clean-up rules
    decls = getDecls(rule, allProperties);
    while (decls.length) {
        const lastNode = decls[decls.length - 1];

        // remove properties of lower precedence
        const lesser = decls.filter(node => 
            !detect(lastNode) &&
            !detect(node) &&
            node !== lastNode && 
            node.important === lastNode.important &&
            getLevel(node.prop) > getLevel(lastNode.prop));

        lesser.forEach(remove);
        decls = decls.filter(node => !~lesser.indexOf(node));
        
        // get duplicate properties
        let duplicates = decls.filter(node => 
            !detect(lastNode) &&
            !detect(node) &&
            node !== lastNode && 
            node.important === lastNode.important &&
            node.prop === lastNode.prop);

        if (duplicates.length) {
            if (/hsla|rgba/.test(getColorValue(lastNode))) {
                const preserve = duplicates
                    .filter(node => !/hsla|rgba/.test(getColorValue(node)))
                    .pop();
                duplicates = duplicates.filter(node => node !== preserve);
            }
            duplicates.forEach(remove);
        }
        decls = decls.filter(node => node !== lastNode && !~duplicates.indexOf(node));
    }
}

export default {
    explode,
    merge,
};
