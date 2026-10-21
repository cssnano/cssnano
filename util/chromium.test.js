import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { connect, splitMessages } from './chromium.js';

test('splitMessages reassembles a message split across two chunks', () => {
  const messages = [];
  const handle = splitMessages((message) => messages.push(message));
  handle('{"id":1,"res');
  handle('ult":{}}\0');
  assert.deepEqual(messages, [{ id: 1, result: {} }]);
});

test('splitMessages yields both messages of a chunk that holds two', () => {
  const messages = [];
  splitMessages((message) => messages.push(message))('{"id":1}\0{"id":2}\0');
  assert.deepEqual(messages, [{ id: 1 }, { id: 2 }]);
});

test('connect rejects the command that a protocol error answers', async () => {
  const responses = new PassThrough();
  const { send } = connect(new PassThrough(), responses);
  const reply = send('Runtime.evaluate');
  responses.write('{"id":1,"error":{"message":"no such session"}}\0');
  await assert.rejects(reply, /no such session/v);
});

test('connect rejects every waiting command when the browser fails', async () => {
  const { send, fail } = connect(new PassThrough(), new PassThrough());
  const reply = send('Target.getTargets');
  fail(new Error('Chromium exited'));
  await assert.rejects(reply, /Chromium exited/v);
});

test('connect rejects a command sent after the browser failed', async () => {
  const { send, fail } = connect(new PassThrough(), new PassThrough());
  fail(new Error('Chromium exited'));
  await assert.rejects(send('Runtime.evaluate'), /Chromium exited/v);
});
