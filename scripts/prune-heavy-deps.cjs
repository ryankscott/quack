const fs = require('fs/promises');
const path = require('path');

async function removeIfPresent(targetPath, description) {
  try {
    await fs.access(targetPath);
  } catch {
    console.log(`[prune-heavy-deps] Skipping ${description}; not present at ${targetPath}`);
    return;
  }

  await fs.rm(targetPath, { recursive: true, force: true });
  console.log(`[prune-heavy-deps] Removed ${description}: ${targetPath}`);
}

async function main() {
  const duckdbObjTargetPath = path.join(
    __dirname,
    '..',
    'packages',
    'backend',
    'node_modules',
    'duckdb',
    'build',
    'Release',
    'obj.target'
  );

  await removeIfPresent(duckdbObjTargetPath, 'DuckDB native object files');
}

main().catch((error) => {
  console.error('[prune-heavy-deps] Failed to prune heavy dependency artifacts.');
  console.error(error);
  process.exit(1);
});
