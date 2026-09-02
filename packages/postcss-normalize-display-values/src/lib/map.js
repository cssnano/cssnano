const block = 'block';
const flex = 'flex';
const flowRoot = 'flow-root';
const grid = 'grid';
const inline = 'inline';
const inlineBlock = 'inline-block';
const inlineFlex = 'inline-flex';
const inlineGrid = 'inline-grid';
const inlineTable = 'inline-table';
const listItem = 'list-item';
const ruby = 'ruby';
const runIn = 'run-in';
const table = 'table';

export default new Map([
  ['block,flow', block],
  ['block,flow-root', flowRoot],
  ['inline,flow', inline],
  ['inline,flow-root', inlineBlock],
  ['run-in,flow', runIn],
  ['block,flow,list-item', listItem],
  ['block,,list-item', listItem],
  [',flow,list-item', listItem],
  ['inline,flow,list-item', inline + ' ' + listItem],
  ['inline,,list-item', inline + ' ' + listItem],
  ['block,flex', flex],
  ['inline,flex', inlineFlex],
  ['block,grid', grid],
  ['inline,grid', inlineGrid],
  ['inline,ruby', ruby],
  ['block,table', table],
  ['inline,table', inlineTable],
]);
