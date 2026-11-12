import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const assetsRoot = path.resolve('dist/assets');
const budgets = {
  totalGzipBytes: 450 * 1024,
  entryGzipBytes: 150 * 1024,
  largestRawBytes: 450 * 1024,
};

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectJavaScriptFiles(absolutePath));
    } else if (entry.isFile() && entry.name.endsWith('.js') && !entry.name.endsWith('.js.map')) {
      files.push(absolutePath);
    }
  }

  return files;
}

const files = await collectJavaScriptFiles(assetsRoot);
if (files.length === 0) {
  throw new Error('Bundle budget check found no JavaScript assets in dist/assets.');
}

const assets = await Promise.all(files.map(async (file) => {
  const content = await readFile(file);
  const relativePath = path.relative(assetsRoot, file).split(path.sep).join('/');
  return {
    file: relativePath,
    rawBytes: content.byteLength,
    gzipBytes: gzipSync(content, { level: 9 }).byteLength,
  };
}));

const totalGzipBytes = assets.reduce((total, asset) => total + asset.gzipBytes, 0);
const largestAsset = [...assets].sort((a, b) => b.rawBytes - a.rawBytes)[0];
const entryAsset = assets.find((asset) => /^index-[^/]+\.js$/.test(asset.file));

const summary = {
  assets: assets.length,
  totalGzipKiB: Number((totalGzipBytes / 1024).toFixed(2)),
  entryGzipKiB: entryAsset ? Number((entryAsset.gzipBytes / 1024).toFixed(2)) : null,
  largestRawKiB: Number((largestAsset.rawBytes / 1024).toFixed(2)),
  largestAsset: largestAsset.file,
  budgetsKiB: {
    totalGzip: Number((budgets.totalGzipBytes / 1024).toFixed(0)),
    entryGzip: Number((budgets.entryGzipBytes / 1024).toFixed(0)),
    largestRaw: Number((budgets.largestRawBytes / 1024).toFixed(0)),
  },
};

console.log('JavaScript bundle budget:', JSON.stringify(summary, null, 2));

const violations = [];
if (totalGzipBytes > budgets.totalGzipBytes) {
  violations.push('Total compressed JavaScript exceeds 450 KiB.');
}
if (!entryAsset) {
  violations.push('Vite entry chunk index-*.js was not found.');
} else if (entryAsset.gzipBytes > budgets.entryGzipBytes) {
  violations.push('Compressed entry chunk exceeds 150 KiB.');
}
if (largestAsset.rawBytes > budgets.largestRawBytes) {
  violations.push('Largest JavaScript asset exceeds 450 KiB uncompressed.');
}

if (violations.length > 0) {
  throw new Error('Bundle budget failed:\n- ' + violations.join('\n- '));
}

console.log('PASS: JavaScript bundle remains within the PMV budgets.');
