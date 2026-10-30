import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const review = readFileSync(resolve(root, 'reviews/stage-4.html'), 'utf8');
const page = review
  .replace('<title>破茧 · 阶段 4 体验优化验收</title>', '<title>破茧 · 针毡茧林探索</title>')
  .replace('阶段 4 · 体验优化', '针毡茧林探索')
  .replaceAll('src="../', 'src="./')
  .replace('<script src="./public/data/cocoons-stage4.js"></script>',
    '<script>window.PojianBasePath = "./reviews/";</script>\n  <script src="./public/data/cocoons-stage4.js"></script>');

if (!page.includes('src="./src/stage4.js"') || !page.includes('src="./public/vendor/three.global.js"') || !page.includes('window.PojianBasePath')) {
  throw new Error('Stage 4 entry points were not found; public page was not generated.');
}
writeFileSync(resolve(root, 'index.html'), page);
console.log('Built index.html for the /pojian/ GitHub Pages path');
