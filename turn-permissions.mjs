import assert from 'node:assert/strict';
import WebSocket from 'ws';

const url = 'ws://127.0.0.1:10000/ws';
const open = () => new Promise((resolve, reject) => { const ws = new WebSocket(url); ws.once('open', () => resolve(ws)); ws.once('error', reject); });
const send = (ws, type, data = {}) => ws.send(JSON.stringify({ type, ...data }));
const waitState = (ws, predicate, timeout = 5000) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { ws.off('message', onMessage); reject(new Error('state timeout')); }, timeout);
  const onMessage = raw => { const m = JSON.parse(raw.toString()); if (m.type === 'state' && predicate(m)) { clearTimeout(timer); ws.off('message', onMessage); resolve(m); } };
  ws.on('message', onMessage);
});
const waitError = ws => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { ws.off('message', onMessage); reject(new Error('error timeout')); }, 3000);
  const onMessage = raw => { const m = JSON.parse(raw.toString()); if (m.type === 'error') { clearTimeout(timer); ws.off('message', onMessage); resolve(m); } };
  ws.on('message', onMessage);
});

const a = await open();
send(a, 'create_room', { name: 'Alice' });
const lobby = await waitState(a, s => s.phase === 'lobby');
const b = await open();
send(b, 'join_room', { roomCode: lobby.roomCode, name: 'Bob' });
await waitState(b, s => s.players.length === 2);
send(a, 'ready'); send(b, 'ready');
await waitState(a, s => s.players.filter(p => p.ready).length === 2);
send(a, 'start_match');
await waitState(a, s => s.phase === 'identity');
send(a, 'set_identity', { identity: 'SpongeBob' });
send(b, 'set_identity', { identity: 'Naruto' });
const firstA = await waitState(a, s => s.phase === 'question');
const questionerId = firstA.currentTurn.questionerId;
const targetId = firstA.currentTurn.targetId;
const target = firstA.me.id === targetId ? a : b;
const questioner = firstA.me.id === questionerId ? a : b;
const forbidden = waitError(target);
send(target, 'done_turn');
const error = await forbidden;
assert.equal(error.code, 'NOT_YOUR_TURN');
const nextForQuestioner = waitState(questioner, s => s.phase === 'question' && s.currentTurn?.turnId !== firstA.currentTurn.turnId);
const nextForTarget = waitState(target, s => s.phase === 'question' && s.currentTurn?.turnId !== firstA.currentTurn.turnId);
send(questioner, 'done_turn');
const [qa, qb] = await Promise.all([nextForQuestioner, nextForTarget]);
assert.equal(qa.currentTurn.turnId, qb.currentTurn.turnId);
assert.equal(qa.currentTurn.questionerId, qb.currentTurn.questionerId);
assert.notEqual(qa.currentTurn.turnId, firstA.currentTurn.turnId);
a.close(); b.close();
console.log('turn permissions and synchronization test passed');
