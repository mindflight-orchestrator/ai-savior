# Test de l'extension avec MCP Browser Extension

Le serveur MCP `cursor-browser-extension` est disponible ! Voici comment l'utiliser pour tester l'extension.

## Étapes pour tester

### 1. Charger l'extension manuellement

D'abord, chargez l'extension dans Chrome :

1. Naviguer vers `chrome://extensions/` (déjà fait avec MCP)
2. Activer le "Mode développeur" (toggle en haut à droite)
3. Cliquer sur "Charger l'extension non empaquetée"
4. Sélectionner le dossier `dist/` du projet

### 2. Tester avec MCP Browser Extension

Une fois l'extension chargée, vous pouvez utiliser MCP pour :

#### A. Vérifier que l'extension est chargée

Demandez-moi :
```
"Sur chrome://extensions, vérifie si l'extension AI Saver est listée et son statut"
```

#### B. Tester le popup

1. **Cliquer sur l'icône de l'extension** :
```
"Clique sur l'icône de l'extension AI Saver dans la barre d'outils de Chrome"
```

2. **Faire un snapshot du popup** :
```
"Fais un snapshot du popup de l'extension et montre-moi son contenu"
```

#### C. Tester sur une page réelle (ChatGPT)

1. **Naviguer vers ChatGPT** :
```
"Navigue vers https://chat.openai.com"
```

2. **Vérifier que le content script s'injecte** :
```
"Fais un snapshot de la page et vérifie les messages dans la console"
```

3. **Tester l'extraction XPath** :
```
"Évalue l'XPath '//div[@data-message]' sur cette page et compte les résultats"
```

#### D. Ouvrir les DevTools du Service Worker

1. **Revenir aux extensions** :
```
"Navigue vers chrome://extensions"
```

2. **Ouvrir le service worker** :
```
"Trouve l'extension AI Saver et clique sur le lien 'Service Worker' ou 'service-worker.js'"
```

### 3. Commandes utiles pour tester

#### Vérifier les logs du service worker
```
"Ouvre la console du service worker de l'extension et montre-moi les derniers logs"
```

#### Tester la communication popup ↔ service worker
Dans le popup, vous pouvez tester :
```javascript
chrome.runtime.sendMessage({ action: 'getTabState' }, (response) => {
  console.log('Response:', response);
});
```

#### Tester l'extraction sur ChatGPT
```
"Sur la page ChatGPT, exécute ce code dans la console :
const xpath = '//div[@data-message]';
const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
console.log('Found', result.snapshotLength, 'messages');"
```

## Workflow de test recommandé

1. **Charger l'extension** (manuellement via chrome://extensions)
2. **Vérifier le popup** avec MCP
3. **Tester sur ChatGPT** :
   - Naviguer vers chat.openai.com
   - Vérifier que le content script fonctionne
   - Tester l'extraction XPath
4. **Vérifier IndexedDB** :
   - Ouvrir DevTools → Application → IndexedDB
   - Vérifier que la base `ai_saver_db` existe
   - Vérifier les settings par défaut

## Limitations du MCP Browser Extension

Le MCP Browser Extension permet de :
- ✅ Naviguer vers des pages
- ✅ Faire des snapshots du DOM
- ✅ Exécuter du JavaScript
- ✅ Interagir avec les éléments de la page
- ✅ Voir les messages de console

Mais il ne peut pas directement :
- ❌ Charger une extension (nécessite action manuelle)
- ❌ Accéder aux DevTools internes de l'extension (service worker, popup)
- ❌ Voir IndexedDB directement (nécessite DevTools)

Pour ces éléments, utilisez les DevTools de Chrome directement.

## Prochaines étapes

Une fois l'extension chargée, je peux vous aider à :
1. Tester le popup et sa navigation
2. Tester l'extraction XPath sur ChatGPT
3. Vérifier que les messages entre composants fonctionnent
4. Déboguer les problèmes éventuels

Dites-moi ce que vous voulez tester en premier !
