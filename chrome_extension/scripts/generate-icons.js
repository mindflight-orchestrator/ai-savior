/**
 * Script pour générer les icônes PNG depuis le SVG
 * 
 * Prérequis: Installer sharp: npm install --save-dev sharp
 * 
 * Usage: node scripts/generate-icons.js
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const svgPath = join(rootDir, 'icons', 'icon.svg');
const sizes = [
  { size: 16, name: 'icon16.png' },
  { size: 48, name: 'icon48.png' },
  { size: 128, name: 'icon128.png' },
];

async function generateIcons() {
  try {
    const svgBuffer = readFileSync(svgPath);

    for (const { size, name } of sizes) {
      const outputPath = join(rootDir, 'icons', name);
      
      await sharp(svgBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);

      console.log(`✓ Généré ${name} (${size}x${size})`);
    }

    console.log('\n✓ Toutes les icônes ont été générées avec succès!');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('sharp')) {
      console.error('\n❌ Erreur: Le module "sharp" n\'est pas installé.');
      console.log('   Installez-le avec: npm install --save-dev sharp');
      console.log('   Ou utilisez une autre méthode de génération (voir icons/README.md)');
    } else {
      console.error('❌ Erreur lors de la génération des icônes:', error.message);
    }
    process.exit(1);
  }
}

generateIcons();
