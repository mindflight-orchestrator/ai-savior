import { defineConfig } from 'vite';
import webExtension from 'vite-plugin-web-extension';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';

export default defineConfig({
  plugins: [
    webExtension({
      manifest: './manifest.json',
    }),
    // Plugin personnalisé pour copier les icônes
    {
      name: 'copy-icons',
      closeBundle() {
        const iconsDir = resolve(__dirname, 'icons');
        const distIconsDir = resolve(__dirname, 'dist', 'icons');
        
        if (!existsSync(distIconsDir)) {
          mkdirSync(distIconsDir, { recursive: true });
        }
        
        ['icon16.png', 'icon48.png', 'icon128.png'].forEach((icon) => {
          const src = resolve(iconsDir, icon);
          const dest = resolve(distIconsDir, icon);
          if (existsSync(src)) {
            copyFileSync(src, dest);
            console.log(`✓ Copied ${icon} to dist/icons/`);
          }
        });

        // Corriger le chemin du script dans popup.html
        const popupHtmlPath = resolve(__dirname, 'dist', 'src', 'popup', 'popup.html');
        if (existsSync(popupHtmlPath)) {
          let content = readFileSync(popupHtmlPath, 'utf-8');
          // Remplacer les chemins absolus par des chemins relatifs
          content = content.replace(/src="\/src\/popup\/popup\.js"/g, 'src="./popup.js"');
          writeFileSync(popupHtmlPath, content, 'utf-8');
          console.log('✓ Fixed popup.html script path');
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    // Le plugin webExtension gère automatiquement les entry points depuis le manifest
    // Pas besoin de spécifier rollupOptions.input
  },
});
