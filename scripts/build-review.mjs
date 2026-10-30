import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Build a classic browser script so reviews/stage-1.html opens directly from disk.
// The vendored Three.js sources remain unmodified alongside their MIT license.
const project = resolve(import.meta.dirname, '..');
const corePath = resolve(project, 'vendor/three/three.core.js');
const modulePath = resolve(project, 'vendor/three/three.module.js');
let core = readFileSync(corePath, 'utf8');
let moduleSource = readFileSync(modulePath, 'utf8');

function fields(list) {
  return list.split(',').map(item => item.trim()).filter(Boolean).map(item => {
    const match = item.match(/^(\w+)(?:\s+as\s+(\w+))?$/);
    if (!match) throw new Error(`Unsupported export: ${item}`);
    return { local: match[1], exported: match[2] ?? match[1] };
  });
}

function stripExport(source, label) {
  const matches = [...source.matchAll(/^export \{([^}]+)\};?\s*$/gm)];
  if (matches.length !== 1) throw new Error(`${label}: expected one export statement, found ${matches.length}`);
  const list = fields(matches[0][1]);
  return { body: source.replace(matches[0][0], ''), list };
}

const coreExport = stripExport(core, 'three.core');
const moduleImport = moduleSource.match(/^import \{([^}]+)\} from '\.\/three\.core\.js';\s*$/m);
if (!moduleImport) throw new Error('three.module: core import not found');
const imports = fields(moduleImport[1]);
moduleSource = moduleSource.replace(moduleImport[0], '');
const coreReExport = moduleSource.match(/^export \{[^}]+\} from '\.\/three\.core\.js';\s*$/m);
if (!coreReExport) throw new Error('three.module: core re-export not found');
moduleSource = moduleSource.replace(coreReExport[0], '');
const moduleExport = stripExport(moduleSource, 'three.module');

const objectFields = list => list.map(({ local, exported }) => exported === local ? local : `${JSON.stringify(exported)}: ${local}`).join(',\n');
const destructure = imports.map(({ local, exported }) => exported === local ? local : `${local}: ${exported}`).join(',\n');
const output = `/* Three.js r187, MIT license. See ../vendor/three/LICENSE. Generated for local HTML review. */\n` +
  `(function(global){\n'use strict';\n` +
  `const THREE_CORE=(function(){\n${coreExport.body}\nreturn {${objectFields(coreExport.list)}};\n})();\n` +
  `const THREE=(function(){\nconst {${destructure}}=THREE_CORE;\n${moduleExport.body}\nreturn {${objectFields(moduleExport.list)}};\n})();\n` +
  `global.THREE=Object.assign({},THREE_CORE,THREE);\n})(globalThis);\n`;

const outPath = resolve(project, 'public/vendor/three.global.js');
mkdirSync(resolve(project, 'public/vendor'), { recursive: true });
writeFileSync(outPath, output);
console.log(`Built ${outPath} (${Math.round(output.length / 1024)} KiB)`);
