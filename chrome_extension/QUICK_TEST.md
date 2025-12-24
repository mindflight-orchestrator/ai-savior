# Test Rapide de l'Extension

## Vérifications à faire manuellement

### 1. Vérifier que l'extension est chargée

1. Sur `chrome://extensions/`, vous devriez voir "AI Saver" dans la liste
2. Vérifier qu'elle est activée (toggle activé)
3. Vérifier qu'il n'y a pas d'erreurs affichées

### 2. Tester le popup

1. **Cliquer sur l'icône de l'extension** dans la barre d'outils de Chrome
2. Le popup doit s'ouvrir avec :
   - Header "AI Saver" avec icônes 🔍 et ⚙️
   - Badge "Local" à droite
   - 3 onglets : Save, Search, Snippets
   - Contenu de l'onglet Save visible

3. **Tester la navigation** :
   - Cliquer sur l'onglet "Search" → doit changer d'onglet
   - Cliquer sur l'onglet "Snippets" → doit changer d'onglet
   - Cliquer sur l'onglet "Save" → doit revenir

### 3. Vérifier le Service Worker

1. Sur `chrome://extensions/`
2. Trouver "AI Saver"
3. Cliquer sur "Service Worker" (ou "service-worker.js" ou "inspect views: service worker")
4. DevTools s'ouvre avec la console du service worker
5. Vérifier qu'il n'y a pas d'erreurs dans la console

### 4. Tester les Content Scripts

1. Ouvrir une nouvelle page : https://chat.openai.com
2. Ouvrir DevTools (F12)
3. Aller dans l'onglet "Console"
4. Vérifier qu'il n'y a pas d'erreurs du content script

## Tests avec MCP Browser Extension

Une fois que vous avez cliqué sur l'icône de l'extension et que le popup est ouvert, dites-moi et je pourrai :

1. Faire un snapshot du popup
2. Vérifier son contenu HTML
3. Tester les interactions (clics sur les onglets)
4. Vérifier les messages envoyés au service worker

## Commandes de test dans la console

### Dans la console du Popup (clic droit sur popup → Inspect)

```javascript
// Tester la communication avec Service Worker
chrome.runtime.sendMessage({ action: 'getTabState' }, (response) => {
  console.log('Tab state:', response);
});
```

### Dans la console du Service Worker

```javascript
// Vérifier les settings
chrome.storage.local.get(null, (items) => console.log(items));

// Vérifier que le provider IndexedDB s'initialise
// (nécessite d'importer le provider)
```

### Dans la console d'une page web (Content Script)

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
console.log('Found', result.snapshotLength, 'elements');
```

## Problèmes courants

### Popup ne s'ouvre pas
- Vérifier que l'extension est activée
- Vérifier les erreurs dans `chrome://extensions/`
- Reconstruire l'extension : `npm run build`

### Service Worker ne démarre pas
- Vérifier les erreurs dans la console du service worker
- Vérifier que `dist/src/background/service-worker.js` existe

### Content Script ne s'injecte pas
- Vérifier que l'URL correspond aux patterns dans manifest.json
- Vérifier les erreurs dans la console de la page

Dites-moi ce que vous observez et je pourrai vous aider à déboguer !
