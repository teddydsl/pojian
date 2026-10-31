import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'public/assets/models/hedgehog-plush-game.glb');
const destination = resolve(root, 'public/assets/models/hedgehog-plush-game.embedded.js');
const data = readFileSync(source);
if (data.toString('ascii', 0, 4) !== 'glTF') throw new Error('Hedgehog game asset is not a GLB');
const sha256 = createHash('sha256').update(data).digest('hex');
writeFileSync(destination, `/* User-approved hedgehog with red mini backpack. */\nwindow.PojianHedgehogGlb = { sha256: ${JSON.stringify(sha256)}, byteLength: ${data.length}, base64: ${JSON.stringify(data.toString('base64'))} };\n`);
console.log(`Embedded hedgehog game GLB: ${data.length} bytes, ${sha256.slice(0, 12)}`);
