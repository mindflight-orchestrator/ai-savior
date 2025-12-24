# AI Saver Chrome Extension

Extension Chrome pour sauvegarder et organiser automatiquement vos conversations avec les plateformes IA (ChatGPT, Claude, Perplexity, Kimi).

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
- Chrome/Chromium

### Installation

```bash
# Installer les dépendances
npm install

# Construire l'extension en mode développement (watch)
npm run dev

# Construire pour la production
npm run build
```

### Charger l'extension dans Chrome

1. Ouvrir Chrome et aller à `chrome://extensions/`
2. Activer le "Mode développeur" (en haut à droite)
3. Cliquer sur "Charger l'extension non empaquetée"
4. Sélectionner le dossier `dist/` du projet

### Structure du projet

```
src/
  types/              # Interfaces TypeScript
  lib/
    storage/          # Providers de stockage (IndexedDB, PostgREST)
    extraction/       # Utilitaires d'extraction XPath
    ui/               # Composants UI (toast, flash notice)
  background/         # Service Worker
  content-scripts/    # Scripts injectés dans les pages
  popup/              # Interface popup de l'extension
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
