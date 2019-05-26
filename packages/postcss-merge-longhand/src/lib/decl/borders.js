import { list } from 'postcss';
import { detect } from 'lerna:stylehacks';
import * as R from 'ramda';
import allExcept from '../allExcept';
import insertCloned from '../insertCloned';
import parseTrbl from '../parseTrbl';
import hasAllProps from '../hasAllProps';
import getDecls from '../getDecls';
import getRules from '../getRules';
import getValue from '../getValue';
import mergeRules from '../mergeRules';
import mergeValues from '../mergeValues';
import minifyTrbl from '../minifyTrbl';
import minifyWsc from '../minifyWsc';
import canMerge from '../canMerge';
import remove from '../remove';
import trbl from '../trbl';
import isCustomProp from '../isCustomProp';
import isValueCustomProp from '../isValueCustomProp';
import canExplode from '../canExplode';
import getLastNode from '../getLastNode';
import parseWsc from '../parseWsc';
import { isValidWsc } from '../validateWsc';
import includedIn from '../includedIn';
import isDuplicateProperty from '../isDuplicateProperty';
import isNodePropEqual from '../isNodePropEqual';
import isNodePropOneOf from '../isNodePropOneOf';
import oneOf from '../oneOf';
import equalImportance from '../equalImportance';
import {
  formatPropLeft,
  formatPropsLeft,
  formatPropsRight,
} from '../formatProp';

const wsc = ['width', 'style', 'color'];
const defaults = ['medium', 'none', 'currentcolor'];

function borderProperty(...parts) {
  return `border-${parts.join('-')}`;
}

const mapBorderProperty = R.map(borderProperty);

const directions = mapBorderProperty(trbl);
const properties = mapBorderProperty(wsc);

const directionalProperties = directions.reduce(
  (prev, curr) => prev.concat(formatPropsLeft(curr, wsc)),
  []
);

const precedence = [
  ['border'],
  directions.concat(properties),
  directionalProperties,
];

const allProperties = R.unnest(precedence);

function getLevel(prop) {
  for (let i = 0; i < precedence.length; i++) {
    if (oneOf(precedence[i], prop)) {
      return i;
    }
  }
}

const canMergeValues = R.either(
  R.complement(R.any(isValueCustomProp)),
  R.all(isValueCustomProp)
);

const isAlphaTransparentColour = R.compose(
  R.test(/hsla\(|rgba\(/i),
  getColorValue
);

function getColorValue(decl) {
  if (R.endsWith('color', decl.prop)) {
    return decl.value;
  }

  return parseWsc(decl.value)[2] || defaults[2];
}

function diffingProps(values, nextValues) {
  return wsc.reduce((prev, curr, i) => {
    if (values[i] === nextValues[i]) {
      return prev;
    }

    return [...prev, curr];
  }, []);
}

function mergeRedundant({ values, nextValues, decl, nextDecl, index }) {
  if (!canMerge([decl, nextDecl])) {
    return;
  }

  if (detect(decl) || detect(nextDecl)) {
    return;
  }

  const diff = diffingProps(values, nextValues);

  if (diff.length > 1) {
    return;
  }

  const prop = diff.pop();
  const position = wsc.indexOf(prop);

  const prop1 = formatPropLeft(nextDecl.prop, prop);
  const prop2 = formatPropLeft('border', prop);

  let props = parseTrbl(values[position]);

  props[index] = nextValues[position];

  const borderValue2 = values.filter((e, i) => i !== position).join(' ');
  const propValue2 = minifyTrbl(props);

  const origLength = (minifyWsc(decl.value) + nextDecl.prop + nextDecl.value)
    .length;
  const newLength1 =
    decl.value.length + prop1.length + minifyWsc(nextValues[position]).length;
  const newLength2 = borderValue2.length + prop2.length + propValue2.length;

  if (newLength1 < newLength2 && newLength1 < origLength) {
    nextDecl.prop = prop1;
    nextDecl.value = nextValues[position];
  }

  if (newLength2 < newLength1 && newLength2 < origLength) {
    decl.value = borderValue2;
    nextDecl.prop = prop2;
    nextDecl.value = propValue2;
  }
}

function isCloseEnough(mapped) {
  return (
    (mapped[0] === mapped[1] && mapped[1] === mapped[2]) ||
    (mapped[1] === mapped[2] && mapped[2] === mapped[3]) ||
    (mapped[2] === mapped[3] && mapped[3] === mapped[0]) ||
    (mapped[3] === mapped[0] && mapped[0] === mapped[1])
  );
}

const getDistinctShorthands = R.uniq;

const joinDirectionalValues = R.compose(
  R.map(R.join(' ')),
  R.transpose
);

const valueOrDefault = R.addIndex(R.map)((v, i) => v || defaults[i]);

function explode(rule) {
  rule.walkDecls(/^border/i, (decl) => {
    if (!canExplode(decl, false)) {
      return;
    }

    if (detect(decl)) {
      return;
    }

    const prop = decl.prop.toLowerCase();

    // border -> border-trbl
    if (prop === 'border' && isValidWsc(parseWsc(decl.value))) {
      directions.forEach((direction) => {
        insertCloned(decl.parent, decl, { prop: direction });
      });

      return decl.remove();
    }

    // border-trbl -> border-trbl-wsc
    if (directions.some((direction) => prop === direction)) {
      let values = parseWsc(decl.value);

      if (isValidWsc(values)) {
        wsc.forEach((d, i) => {
          insertCloned(decl.parent, decl, {
            prop: formatPropLeft(prop, d),
            value: values[i] || defaults[i],
          });
        });

        return decl.remove();
      }
    }

    // border-wsc -> border-trbl-wsc
    wsc.some((style) => {
      if (prop !== borderProperty(style)) {
        return false;
      }

      parseTrbl(decl.value).forEach((value, i) => {
        insertCloned(decl.parent, decl, {
          prop: borderProperty(trbl[i], style),
          value,
        });
      });

      return decl.remove();
    });
  });
}

function merge(rule) {
  // border-trbl-wsc -> border-trbl
  trbl.forEach((direction) => {
    const prop = borderProperty(direction);

    mergeRules(
      rule,
      wsc.map((style) => borderProperty(direction, style)),
      (rules, lastNode) => {
        if (canMerge(rules, false) && !rules.some(detect)) {
          insertCloned(lastNode.parent, lastNode, {
            prop,
            value: mergeValues(rules),
          });

          rules.forEach(remove);

          return true;
        }
      }
    );
  });

  // border-trbl-wsc -> border-wsc
  wsc.forEach((style) => {
    const prop = borderProperty(style);

    mergeRules(
      rule,
      trbl.map((direction) => borderProperty(direction, style)),
      (rules, lastNode) => {
        if (canMerge(rules) && !rules.some(detect)) {
          insertCloned(lastNode.parent, lastNode, {
            prop,
            value: minifyTrbl(mergeValues(rules)),
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

    const values = R.map(getValue, rules);

    if (!canMergeValues(values)) {
      return;
    }

    const parsed = R.map(parseWsc, values);

    if (!parsed.every(isValidWsc)) {
      return;
    }

    wsc.forEach((d, i) => {
      const value = parsed.map((v) => v[i] || defaults[i]);

      if (canMergeValues(value)) {
        insertCloned(lastNode.parent, lastNode, {
          prop: borderProperty(d),
          value: minifyTrbl(value),
        });
      } else {
        insertCloned(lastNode.parent, lastNode);
      }
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

    const values = rules.map((node) => parseTrbl(node.value));

    const mapped = joinDirectionalValues(values);

    if (!canMergeValues(mapped)) {
      return;
    }

    const [width, style, color] = rules;
    const reduced = getDistinctShorthands(mapped);

    if (isCloseEnough(mapped) && canMerge(rules, false)) {
      const first =
        mapped.indexOf(reduced[0]) !== mapped.lastIndexOf(reduced[0]);

      const border = insertCloned(lastNode.parent, lastNode, {
        prop: 'border',
        value: first ? reduced[0] : reduced[1],
      });

      if (reduced[1]) {
        const value = first ? reduced[1] : reduced[0];
        const prop = borderProperty(trbl[mapped.indexOf(value)]);

        rule.insertAfter(
          border,
          Object.assign(lastNode.clone(), {
            prop,
            value,
          })
        );
      }
      rules.forEach(remove);

      return true;
    } else if (reduced.length === 1) {
      rule.insertBefore(
        color,
        Object.assign(lastNode.clone(), {
          prop: 'border',
          value: mergeValues([width, style]),
        })
      );

      R.reject(isNodePropEqual(properties[2]), rules).forEach(remove);

      return true;
    }
  });

  // border-wsc -> border + border-trbl
  mergeRules(rule, properties, (rules, lastNode) => {
    if (rules.some(detect)) {
      return;
    }

    const values = rules.map((node) => parseTrbl(node.value));
    const mapped = joinDirectionalValues(values);

    const reduced = getDistinctShorthands(mapped);
    const none = 'medium none currentcolor';

    if (reduced.length > 1 && reduced.length < 4 && reduced.includes(none)) {
      const filtered = allExcept(none, mapped);
      const mostCommon = reduced.sort(
        (a, b) =>
          mapped.filter((v) => v === b).length -
          mapped.filter((v) => v === a).length
      )[0];

      const borderValue = reduced.length === 2 ? filtered[0] : mostCommon;

      rule.insertBefore(
        lastNode,
        Object.assign(lastNode.clone(), {
          prop: 'border',
          value: borderValue,
        })
      );

      directions.forEach((dir, i) => {
        if (mapped[i] !== borderValue) {
          rule.insertBefore(
            lastNode,
            Object.assign(lastNode.clone(), {
              prop: dir,
              value: mapped[i],
            })
          );
        }
      });

      rules.forEach(remove);

      return true;
    }
  });

  // border-trbl -> border
  // border-trbl -> border + border-trbl
  mergeRules(rule, directions, (rules, lastNode) => {
    if (rules.some(detect)) {
      return;
    }

    const values = rules.map((node) => {
      const wscValue = parseWsc(node.value);

      if (!isValidWsc(wscValue)) {
        return node.value;
      }

      return R.compose(
        R.join(' '),
        valueOrDefault
      )(wscValue);
    });

    const reduced = getDistinctShorthands(values);

    if (isCloseEnough(values)) {
      const first =
        values.indexOf(reduced[0]) !== values.lastIndexOf(reduced[0]);

      rule.insertBefore(
        lastNode,
        Object.assign(lastNode.clone(), {
          prop: 'border',
          value: minifyWsc(first ? values[0] : values[1]),
        })
      );

      if (reduced[1]) {
        const value = first ? reduced[1] : reduced[0];
        const prop = directions[values.indexOf(value)];
        rule.insertBefore(
          lastNode,
          Object.assign(lastNode.clone(), {
            prop: prop,
            value: minifyWsc(value),
          })
        );
      }

      rules.forEach(remove);

      return true;
    }
  });

  // border-trbl-wsc + border-trbl (custom prop) -> border-trbl + border-trbl-wsc (custom prop)
  directions.forEach((direction) => {
    wsc.forEach((style, i) => {
      const prop = formatPropLeft(direction, style);

      mergeRules(rule, [direction, prop], (rules, lastNode) => {
        if (lastNode.prop !== direction) {
          return;
        }

        const values = parseWsc(lastNode.value);

        if (!isValidWsc(values)) {
          return;
        }

        const wscProp = allExcept(lastNode, rules)[0];

        if (!isValueCustomProp(values[i]) || isCustomProp(wscProp)) {
          return;
        }

        const wscValue = values[i];

        values[i] = wscProp.value;

        if (canMerge(rules, false) && !rules.some(detect)) {
          insertCloned(lastNode.parent, lastNode, {
            prop,
            value: wscValue,
          });
          lastNode.value = minifyWsc(values);

          wscProp.remove();

          return true;
        }
      });
    });
  });

  // border-wsc + border (custom prop) -> border + border-wsc (custom prop)
  wsc.forEach((style, i) => {
    const prop = borderProperty(style);
    mergeRules(rule, ['border', prop], (rules, lastNode) => {
      if (lastNode.prop !== 'border') {
        return;
      }

      const values = parseWsc(lastNode.value);

      if (!isValidWsc(values)) {
        return;
      }

      const wscProp = allExcept(lastNode, rules)[0];

      if (!isValueCustomProp(values[i]) || isCustomProp(wscProp)) {
        return;
      }

      const wscValue = values[i];

      values[i] = wscProp.value;

      if (canMerge(rules, false) && !rules.some(detect)) {
        insertCloned(lastNode.parent, lastNode, {
          prop,
          value: wscValue,
        });
        lastNode.value = minifyWsc(values);
        wscProp.remove();

        return true;
      }
    });
  });

  // optimize border-trbl
  let decls = getDecls(rule, directions);

  while (decls.length) {
    const lastNode = R.last(decls);

    wsc.forEach((d, i) => {
      const names = R.compose(
        formatPropsRight(d),
        allExcept(lastNode.prop)
      )(directions);

      let nodes = rule.nodes.slice(0, rule.nodes.indexOf(lastNode));

      const border = getLastNode(nodes, 'border');

      if (border) {
        nodes = nodes.slice(nodes.indexOf(border));
      }

      const props = R.filter(
        R.either(isNodePropOneOf(names), equalImportance(lastNode)),
        nodes
      );

      const rules = getRules(props, names);

      if (hasAllProps(rules, names) && !rules.some(detect)) {
        const values = rules.map(getValue);
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

        let refNode = R.last(props);

        if (value === lastNodeValue) {
          refNode = lastNode;
          let valueArray = list.space(lastNode.value);
          valueArray.splice(i, 1);
          lastNode.value = valueArray.join(' ');
        }

        insertCloned(refNode.parent, refNode, {
          prop: borderProperty(d),
          value,
        });

        decls = R.reject(includedIn(rules), decls);
        rules.forEach(remove);
      }
    });

    decls = allExcept(lastNode, decls);
  }

  rule.walkDecls('border', (decl) => {
    const nextDecl = decl.next();

    if (!nextDecl || nextDecl.type !== 'decl') {
      return;
    }

    const index = directions.indexOf(nextDecl.prop);

    if (!~index) {
      return;
    }

    const values = parseWsc(decl.value);
    const nextValues = parseWsc(nextDecl.value);

    if (!isValidWsc(values) || !isValidWsc(nextValues)) {
      return;
    }

    const config = {
      values,
      nextValues,
      decl,
      nextDecl,
      index,
    };

    return mergeRedundant(config);
  });

  rule.walkDecls(/^border($|-(top|right|bottom|left)$)/i, (decl) => {
    let values = parseWsc(decl.value);

    if (!isValidWsc(values)) {
      return;
    }

    const position = directions.indexOf(decl.prop);
    let dirs = [...directions];

    dirs.splice(position, 1);
    wsc.forEach((d, i) => {
      const props = formatPropsRight(d, dirs);

      mergeRules(rule, [decl.prop, ...props], (rules) => {
        if (!rules.includes(decl)) {
          return;
        }

        const longhands = allExcept(decl, rules);

        if (
          longhands[0].value.toLowerCase() ===
            longhands[1].value.toLowerCase() &&
          longhands[1].value.toLowerCase() ===
            longhands[2].value.toLowerCase() &&
          (values[i] !== undefined &&
            longhands[0].value.toLowerCase() === values[i].toLowerCase())
        ) {
          longhands.forEach(remove);

          insertCloned(decl.parent, decl, {
            prop: borderProperty(d),
            value: values[i],
          });

          values[i] = null;
        }
      });

      const newValue = values.join(' ');

      if (newValue) {
        decl.value = newValue;
      } else {
        decl.remove();
      }
    });
  });

  // clean-up values
  rule.walkDecls(/^border($|-(top|right|bottom|left)$)/i, (decl) => {
    decl.value = minifyWsc(decl.value);
  });

  // border-spacing-hv -> border-spacing
  rule.walkDecls(/^border-spacing$/i, (decl) => {
    const value = list.space(decl.value);

    // merge vertical and horizontal dups
    if (value.length > 1 && value[0] === value[1]) {
      decl.value = value[0];
    }
  });

  // clean-up rules
  decls = getDecls(rule, allProperties);

  while (decls.length) {
    const lastNode = R.last(decls);
    const lastPart = lastNode.prop.split('-').pop();

    // remove properties of lower precedence
    const lesser = decls.filter(
      (node) =>
        !detect(lastNode) &&
        !detect(node) &&
        !isCustomProp(lastNode) &&
        node !== lastNode &&
        equalImportance(lastNode, node) &&
        getLevel(node.prop) > getLevel(lastNode.prop) &&
        (!!~node.prop.toLowerCase().indexOf(lastNode.prop) ||
          node.prop.toLowerCase().endsWith(lastPart))
    );

    lesser.forEach(remove);
    decls = R.reject(includedIn(lesser), decls);

    // get duplicate properties
    let duplicates = R.filter(isDuplicateProperty(lastNode), decls);

    if (duplicates.length) {
      if (isAlphaTransparentColour(lastNode)) {
        const preserve = R.compose(
          R.last,
          R.reject(isAlphaTransparentColour)
        )(duplicates);

        duplicates = allExcept(preserve, duplicates);
      }

      duplicates.forEach(remove);
    }

    decls = R.reject(
      R.either(R.equals(lastNode), includedIn(duplicates)),
      decls
    );
  }
}

export default {
  explode,
  merge,
};
