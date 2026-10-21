import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAllName,
  propertyNameKey,
} from '../../../src/passes/ir/propertyName.js';

test('propertyNameKey gives names that differ only by ASCII case one key', () => {
  assert.equal(propertyNameKey('COLOR'), propertyNameKey('color'));
});

test('propertyNameKey keeps the case of custom properties', () => {
  assert.notEqual(propertyNameKey('--Foo'), propertyNameKey('--foo'));
});

test('propertyNameKey does not fold a non-ASCII letter onto an ASCII one', () => {
  assert.notEqual(propertyNameKey('coloſ'), propertyNameKey('color'));
});

test('propertyNameKey decodes an escaped name to the property it spells', () => {
  assert.equal(propertyNameKey('\\63OLOR'), 'color');
});

test('propertyNameKey keeps the case of an escaped custom property', () => {
  assert.equal(propertyNameKey('--\\41'), '--A');
});

test('propertyNameKey treats a name whose escapes decode to a -- prefix as custom', () => {
  assert.equal(propertyNameKey('\\2d\\2dX'), '--X');
});

test('isAllName accepts an escaped all', () => {
  assert.equal(isAllName('\\61 ll'), true);
});

test('isAllName accepts all in any ASCII case', () => {
  assert.equal(isAllName('ALL'), true);
});

test('isAllName rejects a longer name that starts with all', () => {
  assert.equal(isAllName('allow'), false);
});

test('isAllName rejects a custom property named like the all shorthand', () => {
  assert.equal(isAllName('--all'), false);
});
