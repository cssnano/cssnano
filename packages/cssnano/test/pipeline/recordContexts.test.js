import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { buildRecords } from '../../src/passes/ir/buildRecords.js';
import { AT_RULE_BLOCK, RULE } from '../../src/passes/ir/blockRecord.js';
import { createRunContext } from '../../src/passes/ir/runContext.js';
import { contextOf, recordContextOf } from '../../src/pipeline/context.js';

/** @import {BlockRecords} from '../../src/passes/ir/blockRecords.js' */
/** @import {TokenLists} from '../../src/passes/ir/tokenLists.js' */

const edgeCasesFile = new URL(
  '../../script/pipeline/edgeCases.css',
  import.meta.url
);

/**
 * The context of each container of a tree, in document order, by the node
 * form: the stylesheet, each rule, and each at-rule with a block.
 *
 * @param {postcss.Root} root
 * @returns {number[]}
 */
function nodeContextsOf(root) {
  const contexts = new WeakMap();
  /** @type {number[]} */
  const found = [];
  /** @param {postcss.Container} container */
  const visit = (container) => {
    found.push(contextOf(container, contexts));
    for (const child of container.nodes ?? []) {
      if (child.type === 'rule' || (child.type === 'atrule' && child.nodes)) {
        visit(child);
      }
    }
  };
  visit(root);
  return found;
}

/**
 * The context of each container of the records of a build with no stage, in
 * document order, computed by the record form from the stylesheet down.
 *
 * @param {BlockRecords} records
 * @param {TokenLists} tokenLists
 * @returns {number[]}
 */
function recordContextsOf(records, tokenLists) {
  /** @type {number[]} */
  const found = [];
  /**
   * @param {import('../../src/passes/ir/blockRecord.js').ArenaIndex} container
   * @param {number} context
   */
  const visit = (container, context) => {
    found.push(context);
    for (
      let child = records.links.firstChild(container);
      child !== -1;
      child = records.links.nextSibling(child)
    ) {
      const { kind } = records.entry(child);
      if (kind === RULE || kind === AT_RULE_BLOCK) {
        visit(child, recordContextOf(records, tokenLists, child, context));
      }
    }
  };
  visit(records.root.index, 0);
  return found;
}

/**
 * @param {string} css
 * @returns {{node: number[], record: number[]}}
 */
function contextsOf(css) {
  const root = postcss.parse(css);
  const context = createRunContext();
  const { records } = buildRecords(root, context);
  return {
    node: nodeContextsOf(root),
    record: recordContextsOf(records, context.tokenLists),
  };
}

describe('the record form of a container context', () => {
  test('every container of edgeCases.css has the context of the node form', () => {
    const { node, record } = contextsOf(readFileSync(edgeCasesFile, 'utf8'));
    assert.deepEqual(record, node);
  });

  test('every container of each framework stylesheet has the context of the node form', () => {
    const frameworksDir = new URL('../../../../frameworks/', import.meta.url);
    for (const file of readdirSync(frameworksDir).toSorted()) {
      const { node, record } = contextsOf(
        readFileSync(new URL(file, frameworksDir), 'utf8')
      );
      assert.deepEqual(record, node, file);
    }
  });

  test('rules inside keyframes of any vendor spelling have the context of the node form', () => {
    const { node, record } = contextsOf(
      '@-webkit-keyframes k{from{color:red}to{color:blue}}@KeyFrames j{50%{top:0}}'
    );
    assert.deepEqual(record, node);
  });

  test('an @property whose last syntax declaration keeps an important comment has the context of the node form', () => {
    const { node, record } = contextsOf(
      '@property --a{syntax:"<percentage>" /*! keep */;inherits:false}@property --b{syntax:"<length>" /*! keep */;inherits:false}'
    );
    assert.deepEqual(record, node);
  });
});
