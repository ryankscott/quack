#!/usr/bin/env node

/**
 * Generate app icons from the quack_icon.svg in the frontend
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const iconsDir = path.resolve(__dirname, '../src-tauri/icons');
const sourceSvgPath = path.resolve(__dirname, '../../frontend/public/quack_icon.svg');

async function main() {
  console.log('Generating app icons from quack_icon.svg...');

  // Ensure icons directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Check if source SVG exists
  if (!fs.existsSync(sourceSvgPath)) {
    console.error(`Error: Source SVG not found at ${sourceSvgPath}`);
    process.exit(1);
  }

  // Read the original SVG
  let svgContent = fs.readFileSync(sourceSvgPath, 'utf-8');
  
  // Parse SVG dimensions to make it square
  const widthMatch = svgContent.match(/width="([^"]+)"/);
  const heightMatch = svgContent.match(/height="([^"]+)"/);
  const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
  
  if (widthMatch && heightMatch) {
    const width = parseFloat(widthMatch[1]);
    const height = parseFloat(heightMatch[1]);
    const maxDim = Math.max(width, height);
    
    // Calculate centering offsets
    const xOffset = (maxDim - width) / 2;
    const yOffset = (maxDim - height) / 2;
    
    // Create a square SVG with the original centered
    const squareSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(${xOffset * (1024 / maxDim)}, ${yOffset * (1024 / maxDim)}) scale(${1024 / maxDim})">
    ${svgContent.replace(/<\?xml[^>]*\?>/, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}
  </g>
</svg>`;
    
    svgContent = squareSvg;
  } else if (viewBoxMatch) {
    // Use viewBox to create square version
    const [vbX, vbY, vbWidth, vbHeight] = viewBoxMatch[1].split(/\s+/).map(parseFloat);
    const maxDim = Math.max(vbWidth, vbHeight);
    const xOffset = (maxDim - vbWidth) / 2;
    const yOffset = (maxDim - vbHeight) / 2;
    
    const squareSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" viewBox="0 0 ${maxDim} ${maxDim}" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(${xOffset}, ${yOffset})">
    ${svgContent.replace(/<\?xml[^>]*\?>/, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}
  </g>
</svg>`;
    
    svgContent = squareSvg;
  }

  // Save the square icon
  const squareSvgPath = path.join(iconsDir, 'app-icon.svg');
  fs.writeFileSync(squareSvgPath, svgContent);
  console.log(`Created square icon at ${squareSvgPath}`);

  // Try to convert SVG to PNG using various methods
  const pngPath = path.join(iconsDir, 'app-icon.png');
  let pngCreated = false;

  // Method 1: Try rsvg-convert (best quality)
  try {
    execSync(`which rsvg-convert`, { stdio: 'pipe' });
    console.log('Using rsvg-convert to generate PNG...');
    execSync(`rsvg-convert -w 1024 -h 1024 "${squareSvgPath}" -o "${pngPath}"`, { stdio: 'inherit' });
    pngCreated = fs.existsSync(pngPath);
    if (pngCreated) console.log('✓ PNG created with rsvg-convert');
  } catch {
    // rsvg-convert not available
  }

  // Method 2: Try ImageMagick convert
  if (!pngCreated) {
    try {
      execSync(`which convert`, { stdio: 'pipe' });
      console.log('Using ImageMagick to generate PNG...');
      execSync(`convert -background none -density 300 -resize 1024x1024 "${squareSvgPath}" "${pngPath}"`, { stdio: 'inherit' });
      pngCreated = fs.existsSync(pngPath);
      if (pngCreated) console.log('✓ PNG created with ImageMagick');
    } catch {
      // ImageMagick not available
    }
  }

  // Method 3: Try inkscape
  if (!pngCreated) {
    try {
      execSync(`which inkscape`, { stdio: 'pipe' });
      console.log('Using Inkscape to generate PNG...');
      execSync(`inkscape "${squareSvgPath}" --export-filename="${pngPath}" --export-width=1024 --export-height=1024`, { stdio: 'inherit' });
      pngCreated = fs.existsSync(pngPath);
      if (pngCreated) console.log('✓ PNG created with Inkscape');
    } catch {
      // Inkscape not available
    }
  }

  // Method 4: Try qlmanage (macOS)
  if (!pngCreated) {
    try {
      console.log('Using qlmanage (macOS) to generate PNG...');
      execSync(`qlmanage -t -s 1024 -o "${iconsDir}" "${squareSvgPath}" 2>/dev/null`, { stdio: 'pipe' });
      const qlOutput = path.join(iconsDir, 'app-icon.svg.png');
      if (fs.existsSync(qlOutput)) {
        fs.renameSync(qlOutput, pngPath);
        pngCreated = true;
        console.log('✓ PNG created with qlmanage');
      }
    } catch {
      // qlmanage failed
    }
  }

  if (!pngCreated) {
    console.error('\n❌ Could not convert SVG to PNG.');
    console.error('Please install one of the following tools:');
    console.error('  - rsvg-convert: brew install librsvg');
    console.error('  - ImageMagick: brew install imagemagick');
    console.error('  - Inkscape: brew install --cask inkscape');
    console.error('\nOr provide a 1024x1024 PNG file at:');
    console.error(`  ${pngPath}`);
    process.exit(1);
  }

  // Now run tauri icon generator
  console.log('\nRunning Tauri icon generator...');
  try {
    execSync(`npx tauri icon "${pngPath}"`, { 
      cwd: path.join(__dirname, '..'), 
      stdio: 'inherit' 
    });
    console.log('\n✓ All icons generated successfully!');
  } catch (err) {
    console.error('\n❌ Tauri icon generation failed');
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
