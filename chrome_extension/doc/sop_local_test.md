# SOP : Mode Développeur et Assistance pour Extension Chrome

## I. Activation du Mode Développeur dans l'Extension

### I.1 Option dans les Settings
Dans `src/popup/settings.html`, ajouter une section **"Mode Développeur"** :

```html
<section id="devModeSection">
  <h2>🔧 Mode Développeur</h2>
  <label>
    <input type="checkbox" id="devModeToggle">
    Activer le mode développeur
  </label>
  
  <div id="devTools" style="display: none;">
    <h3>Outils de Validation</h3>
    <button id="testXPath">Tester XPath sur page active</button>
    <button id="showLogs">Afficher les logs</button>
    <button id="simulateExtraction">Simuler extraction</button>
    <button id="clearCache">Vider cache IndexedDB</button>
    
    <h3>Monitoring</h3>
    <label>
      <input type="checkbox" id="verboseLogging">
      Logging détaillé (toutes les actions)
    </label>
    <label>
      <input type="checkbox" id="xpathHighlighter">
      Surbrillance des éléments trouvés
    </label>
    
    <div id="devOutput" style="background: #f0f0f0; padding: 10px; margin-top: 10px; font-family: monospace; max-height: 300px; overflow-y: auto;"></div>
  </div>
</section>
```

### I.2 Implémentation du Toggle
```typescript
// src/popup/settings.ts
document.getElementById('devModeToggle')?.addEventListener('change', async (e) => {
  const enabled = (e.target as HTMLInputElement).checked;
  await chrome.storage.local.set({ devModeEnabled: enabled });
  
  // Envoyer message au service worker
  await chrome.runtime.sendMessage({ 
    action: 'toggleDevMode', 
    enabled 
  });
  
  // Afficher/masquer les outils
  const tools = document.getElementById('devTools');
  if (tools) tools.style.display = enabled ? 'block' : 'none';
});
```

### I.3 Persistance et Initialisation
```typescript
// Au chargement des settings
const settings = await chrome.storage.local.get('devModeEnabled');
const devMode = settings.devModeEnabled || false;
document.getElementById('devModeToggle')?.setAttribute('checked', devMode);
```

## II. Outils de Validation Intégrés

### II.1 Testeur XPath en Temps Réel
```typescript
// src/popup/settings.ts
document.getElementById('testXPath')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  try {
    const results = await chrome.tabs.sendMessage(tab.id!, {
      action: 'testXPath',
      xpaths: await getConfiguredXPaths(tab.url)
    });
    
    displayDevOutput(`✅ XPath test sur ${tab.url}:
- Conversations trouvées: ${results.conversations?.length || 0}
- Snippets trouvés: ${results.snippets?.length || 0}
- Temps d'exécution: ${results.duration}ms
- Erreurs: ${results.errors?.join(', ') || 'aucune'}`);
  } catch (err) {
    displayDevOutput(`❌ Erreur XPath: ${err.message}`);
  }
});

// src/content-scripts/selector-injector.ts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'testXPath') {
    const start = performance.now();
    const results = {
      conversations: [],
      snippets: [],
      duration: 0,
      errors: []
    };
    
    try {
      // Tester chaque XPath configuré
      for (const [type, xpath] of Object.entries(msg.xpaths)) {
        const elements = document.evaluate(
          xpath, 
          document, 
          null, 
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, 
          null
        );
        
        const found = [];
        for (let i = 0; i < elements.snapshotLength; i++) {
          found.push(elements.snapshotItem(i).textContent.substring(0, 100));
        }
        
        results[type] = found;
      }
    } catch (err) {
      results.errors.push(err.message);
    }
    
    results.duration = performance.now() - start;
    sendResponse(results);
  }
});
```

### II.2 Surbrillance des Éléments (Overlay)
```typescript
// Dans content-script quand devMode activé
function highlightElements(elements: Element[], color = 'rgba(255, 0, 0, 0.3)') {
  elements.forEach(el => {
    const overlay = document.createElement('div');
    const rect = el.getBoundingClientRect();
    overlay.style.cssText = `
      position: absolute;
      top: ${rect.top + window.scrollY}px;
      left: ${rect.left + window.scrollX}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      background: ${color};
      pointer-events: none;
      z-index: 999999;
      border: 2px solid ${color.replace('0.3', '1')};
    `;
    document.body.appendChild(overlay);
    
    // Supprimer après 3 secondes
    setTimeout(() => overlay.remove(), 3000);
  });
}

// Appelé après extraction
if (devMode && verboseLogging) {
  highlightElements(extractedElements, 'rgba(0, 255, 0, 0.3)');
}
```

### II.3 Simulateur d'Extraction
```typescript
// src/popup/settings.ts
document.getElementById('simulateExtraction')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  const mockData = {
    title: "Mock Conversation",
    content: "Ceci est un contenu simulé pour tester l'extraction.",
    url: tab.url,
    tags: ["test", "simulation"],
    estimatedSize: Math.floor(Math.random() * 5000) + 1000
  };
  
  // Ouvrir le popup avec les données simulées
  await chrome.storage.local.set({ simulatedData: mockData });
  await chrome.action.openPopup();
  
  displayDevOutput(`✅ Données simulées générées :
- Titre: ${mockData.title}
- URL: ${mockData.url}
- Taille estimée: ${mockData.estimatedSize} chars`);
});
```

### II.4 Visualiseur de Logs
```typescript
// lib/logger.ts
class DevLogger {
  private static logs: string[] = [];
  
  static log(...args: any[]) {
    const message = `[${new Date().toISOString()}] ${args.join(' ')}`;
    this.logs.push(message);
    
    // Si mode dev activé, afficher dans console et devOutput
    chrome.storage.local.get('devModeEnabled', (result) => {
      if (result.devModeEnabled) {
        console.log(...args);
        this.updateDevOutput();
      }
    });
  }
  
  static updateDevOutput() {
    const output = document.getElementById('devOutput');
    if (output) {
      output.textContent = this.logs.slice(-50).join('\n');
      output.scrollTop = output.scrollHeight;
    }
  }
  
  static clear() {
    this.logs = [];
    this.updateDevOutput();
  }
}

// Remplacer tous les console.log par DevLogger.log
```

## III. Intégration avec Cursor + Chrome DevTools MCP

### III.1 Configuration du MCP Server dans Cursor
1. **Installer le package MCP** :
   ```bash
   npm install -g chrome-devtools-mcp
   ```

2. **Configurer Cursor** :
   - Ouvrir Cursor → Settings → MCP
   - Cliquer "New MCP Server"
   - Ajouter la configuration :
   ```json
   {
     "mcpServers": {
       "chrome-devtools": {
         "command": "chrome-devtools-mcp",
         "args": ["--port", "9222"]
       }
     }
   }
   ```

3. **Lancer Chrome en mode debug** :
   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
     --remote-debugging-port=9222 \
     --user-data-dir=/tmp/chrome-dev-profile
   ```

### III.2 Utilisation dans Cursor
Une fois configuré, tu peux demander à Cursor dans le chat :
- `"Inspecte l'extension AI Saver et montre-moi le contenu du popup"`
- `"Vérifie si le service worker reçoit bien les messages de l'extracteur"`
- `"Teste l'XPath '//div[@data-message]' sur la page ChatGPT ouverte"`

### III.3 Validation Automatisée avec Cursor
Crée un fichier `.cursor/commands.md` avec des commandes prédéfinies :
```markdown
# Commandes de développement pour AI Saver Extension

## Test XPath sur plateforme IA
`/test-xpath chat.openai.com`
→ Ouvre ChatGPT et teste tous les XPath configurés

## Vérifier logs service worker
`/check-logs`
→ Affiche les 20 derniers logs du service worker

## Simuler sauvegarde
`/simulate-save`
→ Génère des données simulées et ouvre le popup
```

## IV. Debugging Avancé

### IV.1 Console DevTools pour Extensions
1. **Service Worker** :
   - Aller à `chrome://extensions/`
   - Trouver "AI Saver" → "Service Worker" (cliquer sur le lien)
   - DevTools s'ouvre avec console dédiée

2. **Popup** :
   - Ouvrir le popup
   - Clic droit → "Inspect" (ou `Ctrl+Shift+I`)
   - Console pour le popup uniquement

3. **Content Script** :
   - Ouvrir la page cible (ex: ChatGPT)
   - DevTools → Console → Source "content-script.js"
   - Ou utiliser `chrome.scripting.executeScript` avec `console.log`

### IV.2 Snippets de Debugging
Créer des snippets dans DevTools (Sources → Snippets) :

**Snippet 1 : Vérifier les permissions**
```javascript
// Vérifier si l'extension a les permissions nécessaires
chrome.permissions.contains({
  origins: ['https://chat.openai.com/*']
}, (result) => {
  console.log('Permissions ChatGPT:', result);
});
```

**Snippet 2 : Tester extraction manuelle**
```javascript
// Exécuter dans la console de la page cible
const xpath = '//div[@data-message-author-role]';
const elements = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
console.log(`Found ${elements.snapshotLength} messages`);
```

### IV.3 Indicateurs Visuels de Debug
Quand `devMode` est activé, ajouter une icône de debug sur toutes les pages IA :
```typescript
// content-scripts/selector-injector.ts
if (devMode) {
  const debugIndicator = document.createElement('div');
  debugIndicator.innerHTML = '🔧';
  debugIndicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 999999;
    background: #4285f4;
    color: white;
    padding: 5px 10px;
    border-radius: 5px;
    font-family: monospace;
  `;
  document.body.appendChild(debugIndicator);
  
  debugIndicator.addEventListener('click', () => {
    // Ouvrir les outils de debug
    chrome.runtime.sendMessage({ action: 'openDevTools' });
  });
}
```

## V. Workflow de Développement Assisté

### V.1 Cycle de Test Rapide
1. **Activer devMode** dans les settings
2. **Ouvrir ChatGPT** (ou autre plateforme)
3. **Clic sur indicateur debug** → Vérifier que l'XPath est valide
4. **Clic sur "Test XPath"** dans settings → Voir les résultats en temps réel
5. **Clic sur l'icône extension** → Vérifier extraction
6. **Consulter les logs** dans devOutput

### V.2 Validation avec Cursor
Dans Cursor, créer un prompt :
```
Utilise le Chrome DevTools MCP pour :
1. Aller sur chat.openai.com
2. Exécuter l'XPath configuré dans l'extension
3. Vérifier que les éléments sont trouvés
4. Me donner les statistiques (nombre, taille)
```

### V.3 Tests Automatisés
Créer un script de test qui utilise le MCP :
```typescript
// test/validate-extraction.ts
import { connectToChrome } from 'chrome-devtools-mcp';

async function testExtraction(url: string, xpaths: Record<string, string>) {
  const browser = await connectToChrome('localhost:9222');
  const page = await browser.newPage();
  await page.goto(url);
  
  const results = {};
  for (const [name, xpath] of Object.entries(xpaths)) {
    const elements = await page.evaluate((xpath) => {
      const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      return result.snapshotLength;
    }, xpath);
    
    results[name] = elements;
  }
  
  console.log('Résultats:', results);
  await browser.close();
}
```

## VI. Bonnes Pratiques

### VI.1 Sécurité en Mode Dev
- **Ne jamais** logger des API keys ou tokens
- **Utiliser** un Chrome profile dédié pour les tests
- **Vider** les logs avant commit git
- **Désactiver** devMode par défaut dans la version release

### VI.2 Performance
- Limiter les logs à 100 dernières lignes
- Désactiver la surbrillance sur les très grandes pages (>1000 éléments)
- Utiliser `console.table()` pour les données structurées

### VI.3 Documentation
Créer un fichier `DEVELOPMENT.md` :
```markdown
## Mode Développeur

1. Activer dans Settings → Mode Développeur
2. Ouvrir Chrome avec `--remote-debugging-port=9222`
3. Configurer Cursor MCP avec chrome-devtools-mcp
4. Utiliser les boutons de validation pour tester les XPath
5. Consulter les logs en temps réel dans devOutput
```

Cette infrastructure de développement te permettra de **déboguer en temps réel**, **valider tes sélecteurs** et **collaborer avec Cursor** pour accélérer le développement de l'extension.
