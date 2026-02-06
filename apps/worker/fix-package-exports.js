// Fix package.json exports to point to dist instead of src
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packagesDir = join(__dirname, '../../packages');
const packages = readdirSync(packagesDir);

packages.forEach(pkg => {
    const pkgJsonPath = join(packagesDir, pkg, 'package.json');

    if (!existsSync(pkgJsonPath)) return;

    console.log(`Fixing ${pkg}/package.json...`);

    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));

    // Fix main field
    if (pkgJson.main === './src/index.ts') {
        pkgJson.main = './dist/index.js';
    }

    // Fix types field
    if (pkgJson.types === './src/index.ts') {
        pkgJson.types = './dist/index.d.ts';
    }

    // Fix exports field
    if (pkgJson.exports && pkgJson.exports['.']) {
        if (pkgJson.exports['.'].import === './src/index.ts') {
            pkgJson.exports['.'].import = './dist/index.js';
        }
        if (pkgJson.exports['.'].types === './src/index.ts') {
            pkgJson.exports['.'].types = './dist/index.d.ts';
        }
    }

    writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2) + '\n');
    console.log(`✓ Fixed ${pkg}/package.json`);
});

console.log('All package.json files fixed!');
