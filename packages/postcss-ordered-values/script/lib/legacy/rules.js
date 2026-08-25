import valueParser from 'postcss-value-parser';
import { addSpace, getArguments, getValue, unit } from './parse.js';
import mathFunctions from './mathfunctions.js';
import vendorUnprefixed from './vendorUnprefixed.js';
import easingFunctions from './easingFunctions.json' with { type: 'json' };
import listStyleTypes from './listStyleTypes.json' with { type: 'json' };

const timingFunctions = new Set([...easingFunctions.functions, 'frames']);
const timingKeywords = new Set(easingFunctions.keywords);
const timeUnits = new Set(['ms', 's']);
const directions = new Set([
  'normal',
  'reverse',
  'alternate',
  'alternate-reverse',
]);
const fillModes = new Set(['none', 'forwards', 'backwards', 'both']);
const playStates = new Set(['running', 'paused']);
const borderWidths = new Set(['thin', 'medium', 'thick']);
const borderStyles = new Set([
  'none',
  'auto',
  'hidden',
  'dotted',
  'dashed',
  'solid',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
]);
const flexDirection = new Set([
  'row',
  'row-reverse',
  'column',
  'column-reverse',
]);
const flexWrap = new Set(['nowrap', 'wrap', 'wrap-reverse']);
const definedTypes = new Set(listStyleTypes['list-style-type']);
const definedPosition = new Set(['inside', 'outside']);

function border(nodes) {
  const order = { width: '', style: '', color: '' };
  nodes.walk((node) => {
    if (node.type === 'word') {
      const value = node.value;
      if (borderStyles.has(value.toLowerCase())) order.style = value;
      else if (borderWidths.has(value.toLowerCase()) || unit(value))
        order.width = order.width ? `${order.width} ${value}` : value;
      else order.color = value;
    } else if (node.type === 'function') {
      if (mathFunctions.has(node.value.toLowerCase()))
        order.width = valueParser.stringify(node);
      else order.color = valueParser.stringify(node);
    }
    return false;
  });
  return `${order.width} ${order.style} ${order.color}`.trim();
}

function animation(parsed) {
  const result = [];
  for (const arg of getArguments(parsed)) {
    const state = {
      name: [],
      duration: [],
      timingFunction: [],
      delay: [],
      iterationCount: [],
      direction: [],
      fillMode: [],
      playState: [],
    };
    for (const node of arg) {
      if (node.type === 'space') continue;
      const value = node.value,
        lower = value.toLowerCase(),
        quantity =
          node.type === 'function' && mathFunctions.has(lower)
            ? undefined
            : unit(value);
      let property;
      if (quantity && timeUnits.has(quantity.unit))
        property = state.duration.length ? 'delay' : 'duration';
      else if (
        (node.type === 'function' && timingFunctions.has(lower)) ||
        timingKeywords.has(lower)
      )
        property = 'timingFunction';
      else if (lower === 'infinite' || (quantity && !quantity.unit))
        property = 'iterationCount';
      else if (directions.has(lower)) property = 'direction';
      else if (fillModes.has(lower)) property = 'fillMode';
      else if (playStates.has(lower)) property = 'playState';
      if (property && !state[property].length)
        state[property] = [node, addSpace()];
      else state.name.push(node, addSpace());
    }
    result.push(valueParser.stringify(Object.values(state).flat()).trimEnd());
  }
  return result.join(',');
}

function boxShadow(parsed) {
  const result = [];
  for (const arg of getArguments(parsed)) {
    const inset = [],
      lengths = [],
      color = [];
    for (const node of arg) {
      if (node.type === 'space') continue;
      if (
        node.type === 'function' &&
        mathFunctions.has(vendorUnprefixed(node.value.toLowerCase()))
      )
        return parsed.toString();
      if (unit(node.value)) lengths.push(node, addSpace());
      else if (node.value.toLowerCase() === 'inset')
        inset.push(node, addSpace());
      else color.push(node, addSpace());
    }
    result.push([...inset, ...lengths, ...color]);
  }
  return getValue(result);
}

function transition(parsed) {
  const result = [];
  for (const arg of getArguments(parsed)) {
    const state = { timingFunction: [], property: [], time1: [], time2: [] };
    for (const node of arg) {
      if (node.type === 'space') continue;
      const value = node.value,
        lower = value.toLowerCase();
      if (
        node.type === 'function' &&
        new Set(easingFunctions.functions).has(lower)
      )
        state.timingFunction.push(node, addSpace());
      else if (unit(value))
        (state.time1.length ? state.time2 : state.time1).push(node, addSpace());
      else if (timingKeywords.has(lower))
        state.timingFunction.push(node, addSpace());
      else state.property.push(node, addSpace());
    }
    result.push([
      ...state.property,
      ...state.time1,
      ...state.timingFunction,
      ...state.time2,
    ]);
  }
  return getValue(result);
}

function listStyle(nodes) {
  const order = { type: '', position: '', image: '' };
  nodes.walk((node) => {
    if (node.type === 'word') {
      if (definedTypes.has(node.value)) order.type += ` ${node.value}`;
      else if (definedPosition.has(node.value))
        order.position += ` ${node.value}`;
      else if (
        node.value === 'none' &&
        order.type.split(' ').filter(Boolean).includes('none')
      )
        order.image += ` ${node.value}`;
      else order.type += ` ${node.value}`;
    } else if (node.type === 'function')
      order.image += ` ${valueParser.stringify(node)}`;
    return false;
  });
  return `${order.type.trim()} ${order.position.trim()} ${order.image.trim()}`.trim();
}

function flexFlow(nodes) {
  const order = { direction: '', wrap: '' };
  nodes.walk(({ value }) => {
    if (flexDirection.has(value.toLowerCase())) order.direction = value;
    else if (flexWrap.has(value.toLowerCase())) order.wrap = value;
    return false;
  });
  return `${order.direction} ${order.wrap}`.trim();
}

function columns(nodes) {
  const widths = [],
    other = [];
  nodes.walk((node) => {
    if (node.type === 'word')
      (unit(node.value)?.unit ? widths : other).push(node.value);
    return false;
  });
  return other.length === 1 && widths.length === 1
    ? `${widths[0].trimStart()} ${other[0].trimStart()}`
    : nodes.toString();
}

function gridAutoFlow(nodes) {
  const values = nodes.nodes
    .filter((node) => node.type !== 'space')
    .map((node) => node.value);
  return values.every((value) =>
    ['dense', 'row', 'column'].includes(value.toLowerCase())
  )
    ? `${values.find((value) => ['row', 'column'].includes(value.toLowerCase())) || ''} ${values.find((value) => value.toLowerCase() === 'dense') || ''}`.trim()
    : nodes.toString();
}
function gridGap(nodes) {
  const values = nodes.nodes
    .filter((node) => node.type !== 'space')
    .map((node) => node.value);
  return values.includes('normal')
    ? `normal ${values.filter((value) => value !== 'normal').join(' ')}`.trim()
    : nodes.toString();
}
function gridColumnRow(nodes) {
  const lines = getArguments({
    nodes: nodes.nodes.map((node) =>
      node.type === 'div' && node.value === '/'
        ? { type: 'div', value: ',' }
        : node
    ),
  });
  return lines.length > 1
    ? lines
        .map((line) => {
          const values = line
            .filter((node) => node.type !== 'space')
            .map((node) =>
              node.type === 'function'
                ? valueParser.stringify(node)
                : node.value
            );
          return `${values.filter((value) => value === 'span').join(' ')} ${values.filter((value) => value !== 'span').join(' ')}`.trim();
        })
        .join(' /  ')
    : nodes.toString();
}

const rules = new Map([
  ['animation', animation],
  ['outline', border],
  ['box-shadow', boxShadow],
  ['flex-flow', flexFlow],
  ['list-style', listStyle],
  ['transition', transition],
  ['columns', columns],
  ['column-rule', border],
  ['grid-auto-flow', gridAutoFlow],
  ['grid-column-gap', gridGap],
  ['grid-row-gap', gridGap],
  ['grid-column', gridColumnRow],
  ['grid-row', gridColumnRow],
  ['grid-column-start', gridColumnRow],
  ['grid-column-end', gridColumnRow],
  ['grid-row-start', gridColumnRow],
  ['grid-row-end', gridColumnRow],
  ...[
    'border',
    'border-block',
    'border-inline',
    'border-block-end',
    'border-block-start',
    'border-inline-end',
    'border-inline-start',
    'border-top',
    'border-right',
    'border-bottom',
    'border-left',
  ].map((property) => [property, border]),
]);

export { rules };
