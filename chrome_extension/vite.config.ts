import { defineConfig } from 'vite';
import webExtension from 'vite-plugin-web-extension';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';

const targets = {
  chrome: {
    manifest: './manifests/manifest.chrome.json',
    outDir: 'dist',
  },
  brave: {
    manifest: './manifests/manifest.brave.json',
    outDir: '../brave_extension/dist',
  },
  firefox: {
    manifest: './manifests/manifest.firefox.json',
    outDir: '../firefox_extension/dist',
  },
} as const;

type ExtensionTarget = keyof typeof targets;

function resolveTarget(mode: string): ExtensionTarget {
  const target = (process.env.EXTENSION_TARGET || mode || 'chrome') as ExtensionTarget;
  if (target in targets) {
    return target;
  }
  return 'chrome';
}

export default defineConfig(({ mode }) => {
  const target = resolveTarget(mode);
  const targetConfig = targets[target];

  return {
    plugins: [
      webExtension({
        manifest: targetConfig.manifest,
      }),
      // Plugin personnalisé pour copier les icônes
      {
        name: 'copy-icons',
        closeBundle() {
          const iconsDir = resolve(__dirname, 'icons');
          const distDir = resolve(__dirname, targetConfig.outDir);
          const distIconsDir = resolve(distDir, 'icons');

          if (!existsSync(distIconsDir)) {
            mkdirSync(distIconsDir, { recursive: true });
          }

          // Copy main icons
          ['icon16.png', 'icon48.png', 'icon128.png'].forEach((icon) => {
            const src = resolve(iconsDir, icon);
            const dest = resolve(distIconsDir, icon);
            if (existsSync(src)) {
              copyFileSync(src, dest);
              console.log(`✓ Copied ${icon} to dist/icons/`);
            }
          });

          // Copy favicons folder
          const faviconsDir = resolve(iconsDir, 'favicons');
          const distFaviconsDir = resolve(distIconsDir, 'favicons');
          if (existsSync(faviconsDir)) {
            if (!existsSync(distFaviconsDir)) {
              mkdirSync(distFaviconsDir, { recursive: true });
            }
            const faviconFiles = readdirSync(faviconsDir);
            faviconFiles.forEach((file) => {
              const src = resolve(faviconsDir, file);
              const dest = resolve(distFaviconsDir, file);
              copyFileSync(src, dest);
            });
            console.log(`✓ Copied ${faviconFiles.length} favicons to dist/icons/favicons/`);
          }

          // Corriger le chemin du script dans popup.html
          const popupHtmlPath = resolve(distDir, 'src', 'popup', 'popup.html');
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
      outDir: targetConfig.outDir,
      emptyOutDir: true,
      // Le plugin webExtension gère automatiquement les entry points depuis le manifest
      // Pas besoin de spécifier rollupOptions.input
    },
  };
});
