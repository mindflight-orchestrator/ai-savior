# AI Savior Browser Extension

Extension navigateur pour sauvegarder et organiser automatiquement vos conversations avec les plateformes IA (ChatGPT, Claude, Perplexity, Kimi). Le code source est commun, avec des builds séparés pour Chrome, Brave et Firefox.

## Fonctionnalités

- **Beast Mode** : Collecte automatique des conversations sur les plateformes IA configurées
- **Mode Local** : Stockage dans IndexedDB (fonctionne hors ligne)
- **Mode Cloud** : Stockage dans PostgreSQL via PostgREST (optionnel)
- **Recherche** : Recherche dans les conversations et snippets sauvegardés
- **Collections** : Organisation des conversations par collections
- **Mode Développeur** : Outils de test et validation XPath

## Développement

### Prérequis

- Node.js 18+
- npm ou pnpm
- Chrome/Chromium, Brave ou Firefox

### Installation

```bash
# Installer les dépendances
npm install

# Construire l'extension Chrome en mode développement (watch)
npm run dev:chrome

# Construire pour la production
npm run build:chrome
npm run build:brave
npm run build:firefox

# Ou tout construire
npm run build:all
```

### Charger l'extension

Chrome:
1. Ouvrir Chrome et aller à `chrome://extensions/`
2. Activer le "Mode développeur" (en haut à droite)
3. Cliquer sur "Charger l'extension non empaquetée"
4. Sélectionner le dossier `chrome_extension/dist/`

Brave:
1. Ouvrir Brave et aller à `brave://extensions/`
2. Activer le "Mode développeur"
3. Charger le dossier `brave_extension/dist/`

Firefox:
1. Ouvrir Firefox et aller à `about:debugging#/runtime/this-firefox`
2. Cliquer sur "Load Temporary Add-on"
3. Sélectionner `firefox_extension/dist/manifest.json`

### Structure du projet

```
chrome_extension/
  src/                # Code commun
  manifests/          # Manifestes par navigateur
  dist/               # Build Chrome
brave_extension/
  dist/               # Build Brave
firefox_extension/
  dist/               # Build Firefox
```

## Architecture

L'extension suit une architecture modulaire :

- **Service Worker** : Hub central qui coordonne les communications
- **Content Scripts** : Extraction de contenu via XPath
- **Storage Providers** : Interface commune pour IndexedDB et PostgREST
- **Popup UI** : Interface utilisateur avec onglets (Save, Search, Snippets, Settings)

## Mode Cloud (PostgreSQL + PostgREST)

Voir `docker/README.md` pour les instructions Docker (Phase 12 du plan d'implémentation).

## GUIDE D'UTILISATION

Voir `doc/GUIDE_UTILISATION.md` pour le  guide.

## License

MIT
