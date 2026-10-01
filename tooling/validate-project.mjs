import fs from 'node:fs';
import path from 'node:path';

const manifest = JSON.parse(fs.readFileSync(path.resolve('FINESSE_31_ROOM_PROJECT.json'), 'utf8'));
const errors = [];
const rooms = manifest.rooms ?? [];
const required = ['number', 'id', 'name', 'plate', 'route', 'category', 'access', 'serviceDomains', 'design', 'primaryAction', 'api', 'revenue', 'phase', 'truthState'];

if (rooms.length !== 31) errors.push(`Expected 31 rooms, got ${rooms.length}`);
if (manifest.project.roomCount !== 31) errors.push('Project roomCount must be 31');
if (manifest.project.canonicalServiceDomainCount !== 23) errors.push('Expected 23 original service rooms');
if (manifest.project.additionalCinematicPlateCount !== 8) errors.push('Expected 8 additional cinematic plates');

const ids = new Set();
const routes = new Set();
const numbers = new Set();
for (const room of rooms) {
  for (const key of required) if (room[key] === undefined || room[key] === null || room[key] === '') errors.push(`${room.id ?? '?'}: missing ${key}`);
  if (ids.has(room.id)) errors.push(`Duplicate room id: ${room.id}`);
  if (routes.has(room.route)) errors.push(`Duplicate room route: ${room.route}`);
  if (numbers.has(room.number)) errors.push(`Duplicate room number: ${room.number}`);
  if (!room.route.startsWith('/')) errors.push(`Bad route: ${room.id}`);
  if (!Array.isArray(room.api) || !Array.isArray(room.revenue)) errors.push(`Bad API/revenue list: ${room.id}`);
  if (!['wired', 'specified', 'preview', 'gated'].includes(room.truthState)) errors.push(`Bad truth state: ${room.id}`);
  ids.add(room.id);
  routes.add(room.route);
  numbers.add(room.number);
}
for (let n = 1; n <= 31; n++) if (!numbers.has(n)) errors.push(`Missing room number ${n}`);
if (manifest.accessFlow.vipPenthouseElevator.roomId !== 'vip-room') errors.push('Penthouse must be a destination within VIP Room');
if (manifest.accessFlow.vipPenthouseElevator.destination !== '/vip/penthouse') errors.push('Penthouse destination must remain under /vip');
if (ids.has('penthouse')) errors.push('Penthouse must not become room 32');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Finesse manifest valid: ${rooms.length} rooms, ${ids.size} IDs, ${routes.size} routes, 2 independent KeyLocks.`);
}
