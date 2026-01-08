# Guide de Test - Extension AI Saver

## Méthode 1 : Test manuel avec Chrome DevTools

### 1. Charger l'extension

1. Construire l'extension :
   ```bash
   npm run build
   ```

2. Ouvrir Chrome → `chrome://extensions/`
3. Activer "Mode développeur"
4. Cliquer "Charger l'extension non empaquetée"
5. Sélectionner le dossier `dist/`

### 2. Tester le popup

1. Cliquer sur l'icône de l'extension dans la barre d'outils
2. Le popup doit s'ouvrir avec les onglets (Save, Search, Snippets)
3. Vérifier que la navigation entre onglets fonctionne

### 3. Tester le Service Worker

1. Aller à `chrome://extensions/`
2. Trouver "AI Saver" → Cliquer sur "Service Worker" (lien cliquable)
3. DevTools s'ouvre avec la console du service worker
4. Vérifier qu'il n'y a pas d'erreurs au démarrage

### 4. Tester les Content Scripts

1. Ouvrir une page ChatGPT : https://chat.openai.com
2. Ouvrir DevTools (F12)
3. Aller dans l'onglet "Console"
4. Vérifier qu'il n'y a pas d'erreurs du content script

## Méthode 2 : Test avec Chrome en mode Debug (pour MCP)

### Prérequis

1. **Installer le package MCP** (si disponible) :
   ```bash
   npm install -g chrome-devtools-mcp
   ```

2. **Lancer Chrome en mode debug** :
   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --remote-debugging-port=9222 \
     --user-data-dir=/tmp/chrome-dev-profile
   ```

3. **Configurer Cursor MCP** (si le serveur est disponible) :
   - Ouvrir Cursor → Settings → MCP
   - Ajouter la configuration pour chrome-devtools-mcp

### Utilisation avec MCP Browser Extension

Si le serveur MCP `cursor-browser-extension` est disponible, vous pouvez :

1. **Naviguer vers ChatGPT** :
   ```
   "Navigue vers chat.openai.com avec Chrome"
   ```

2. **Vérifier le contenu de la page** :
   ```
   "Fais un snapshot de la page ChatGPT et montre-moi le DOM"
   ```

3. **Tester l'extraction XPath** :
   ```
   "Évalue l'XPath '//div[@data-message]' sur la page actuelle"
   ```

4. **Vérifier les logs de l'extension** :
   - Via Chrome DevTools directement
   - Ou via la console du service worker

## Méthode 3 : Test automatisé avec scripts

### Script de test basique

Créer un fichier `test/manual-test.html` pour tester l'extension localement :

```html
<!DOCTYPE html>
<html>
<head>
  <title>Test Extension AI Saver</title>
</head>
<body>
  <h1>Test Page pour Extension</h1>
  <div data-message="test">Message de test</div>
  
  <script>
    // Simuler une conversation ChatGPT
    console.log('Page de test chargée');
  </script>
</body>
</html>
```

## Checklist de test

### Fonctionnalités de base

- [ ] Extension se charge sans erreur
- [ ] Icône apparaît dans la barre d'outils
- [ ] Popup s'ouvre au clic sur l'icône
- [ ] Navigation entre onglets fonctionne
- [ ] Service Worker démarre correctement
- [ ] Content script s'injecte sur les pages configurées

### IndexedDB

- [ ] Base de données s'initialise au premier lancement
- [ ] Settings par défaut sont créés
- [ ] On peut sauvegarder une conversation (via code de test)

### Messages entre composants

- [ ] Popup peut envoyer des messages au Service Worker
- [ ] Service Worker répond aux messages
- [ ] Content Script peut communiquer avec Service Worker

## Commandes utiles pour le debug

### Dans la console du Service Worker

```javascript
// Vérifier les settings
chrome.storage.local.get(null, (items) => console.log(items));

// Vérifier IndexedDB
// (nécessite d'utiliser l'API IndexedDB directement)
```

### Dans la console du Popup

```javascript
// Tester la communication avec Service Worker
chrome.runtime.sendMessage({ action: 'getTabState' }, (response) => {
  console.log('Response:', response);
});
```

### Dans la console d'une page (Content Script)

```javascript
// Tester l'extraction XPath
const xpath = '//div[@data-message]';
const result = document.evaluate(
  xpath,
  document,
  null,
  XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
  null
);
console.log(`Found ${result.snapshotLength} elements`);
```

## Méthode 4 : Tests automatisés avec Playwright

### Installation

1. **Installer les dépendances** :
   ```bash
   npm install
   ```

2. **Installer les navigateurs Playwright** :
   ```bash
   npx playwright install chromium
   ```

3. **Construire l'extension** (nécessaire avant les tests) :
   ```bash
   npm run build
   ```

### Exécuter les tests

```bash
# Tous les tests
npm test

# Mode UI interactif
npm run test:ui

# Mode headed (voir le navigateur)
npm run test:headed

# Mode debug
npm run test:debug

# Un fichier spécifique
npx playwright test tests/popup.spec.ts
```

### Structure des tests

Les tests sont organisés dans le dossier `tests/` :

- `extension-loading.spec.ts` - Vérifie que l'extension se charge correctement
- `popup.spec.ts` - Teste l'interface popup et la navigation
- `content-script.spec.ts` - Teste l'injection des content scripts et l'extraction
- `storage.spec.ts` - Teste IndexedDB et chrome.storage
- `helpers/extension-helpers.ts` - Fonctions utilitaires pour travailler avec l'extension

### Exemple de test

```typescript
test('Popup should open and display correctly', async () => {
  const popup = await getExtensionPopup(context, extensionId);
  await popup.waitForLoadState('networkidle');
  
  const title = await popup.title();
  expect(title).toBeTruthy();
  
  await popup.close();
});
```

### Notes importantes

- **Mode headless** : Les extensions Chrome ne fonctionnent PAS en mode headless. Playwright configure automatiquement `headless: false`.
- **Service Workers** : Le test des service workers est limité car ils sont isolés.
- **Sites réels** : Les tests qui accèdent à des sites réels (comme chat.openai.com) peuvent être instables.

Voir `tests/README.md` pour plus de détails.

## Prochaines étapes

Une fois les tests de base validés :

1. ✅ Ajouter des tests E2E avec Playwright (fait)
2. Implémenter les tests unitaires pour le provider IndexedDB
3. Créer des tests d'intégration pour le Beast Mode
4. Ajouter des tests de performance
