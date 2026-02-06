import esbuild from 'esbuild';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read package.json to get dependencies to exclude
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const dependencies = Object.keys(pkg.dependencies || {}).filter(d => !d.startsWith('@cogtics/'));
const peerDependencies = Object.keys(pkg.peerDependencies || {});

console.log('Bundling worker with esbuild...');
console.log('External dependencies:', [...dependencies, ...peerDependencies]);

await esbuild.build({
    entryPoints: ['src/bootstrap.ts'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile: 'dist/bootstrap.js',
    external: [...dependencies, ...peerDependencies],
    sourcemap: true,
    logLevel: 'info',
});
