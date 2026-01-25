#!/usr/bin/env node

/**
 * Build script for creating the backend sidecar binary for Tauri
 *
 * This script:
 * 1. Compiles TypeScript to JavaScript
 * 2. Uses pkg to bundle the Node.js backend into a standalone binary
 * 3. Renames the binary with the target triple suffix for Tauri
 * 4. Copies the binary to the desktop package's binaries folder
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');
const desktopBinDir = path.resolve(__dirname, '../../desktop/src-tauri/binaries');

// Get the platform extension
const ext = process.platform === 'win32' ? '.exe' : '';

// Get the target triple from rustc
function getTargetTriple() {
  try {
    return execSync('rustc --print host-tuple', { encoding: 'utf8' }).trim();
  } catch {
    // Fallback for older Rust versions
    const rustInfo = execSync('rustc -vV', { encoding: 'utf8' });
    const match = /host: (\S+)/g.exec(rustInfo);
    if (match) {
      return match[1];
    }
    throw new Error('Failed to determine platform target triple');
  }
}

async function main() {
  console.log('Building backend sidecar...');

  // Step 1: Compile TypeScript
  console.log('Compiling TypeScript...');
  execSync('pnpm build', { cwd: backendDir, stdio: 'inherit' });

  // Step 2: Create pkg config
  const pkgConfig = {
    pkg: {
      scripts: ['dist/**/*.js'],
      assets: [],
      targets: ['node20'],
      outputPath: 'sidecar-build',
    },
  };

  // Write temporary pkg config
  const pkgConfigPath = path.join(backendDir, 'pkg.json');
  fs.writeFileSync(pkgConfigPath, JSON.stringify(pkgConfig, null, 2));

  // Step 3: Build with pkg
  console.log('Bundling with pkg...');

  // Ensure output directory exists
  const outputDir = path.join(backendDir, 'sidecar-build');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputName = `quack-backend${ext}`;
  const outputPath = path.join(outputDir, outputName);

  try {
    execSync(
      `npx @yao-pkg/pkg dist/server.js --target node20 --output "${outputPath}"`,
      { cwd: backendDir, stdio: 'inherit' }
    );
  } finally {
    // Clean up pkg config
    if (fs.existsSync(pkgConfigPath)) {
      fs.unlinkSync(pkgConfigPath);
    }
  }

  // Step 4: Get target triple and rename
  const targetTriple = getTargetTriple();
  console.log(`Target triple: ${targetTriple}`);

  // Ensure destination directory exists
  if (!fs.existsSync(desktopBinDir)) {
    fs.mkdirSync(desktopBinDir, { recursive: true });
  }

  // Step 5: Copy to desktop package with correct name
  const finalName = `quack-backend-${targetTriple}${ext}`;
  const finalPath = path.join(desktopBinDir, finalName);

  console.log(`Copying to ${finalPath}...`);
  fs.copyFileSync(outputPath, finalPath);

  // Make executable on Unix systems
  if (process.platform !== 'win32') {
    fs.chmodSync(finalPath, 0o755);
  }

  console.log('Sidecar build complete!');
  console.log(`Output: ${finalPath}`);
}

main().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
