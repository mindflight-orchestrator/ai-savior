Plan d'implémentation - Extension Chrome AI Saver
Vue d'ensemble de l'architecture
Externe
Storage Layer
Extension Chrome
Messages
Messages
Extrait
CRUD
Sync
REST
Plateformes IAChatGPT/Claude/etc.
PostgreSQLCloud
IndexedDBLocal &amp; Cache
PostgRESTCloud Mode
Popup UISave/Search/Snippets
Service WorkerHub Central
Content ScriptsExtraction XPath
Phase 1 : Infrastructure de base et types
1.1 Configuration du projet
Fichiers : package.json, tsconfig.json, manifest.json, vite.config.ts

Initialiser projet TypeScript avec Vite
Configurer Manifest V3 (manifest.json)
Permissions : storage, tabs, scripting, activeTab
Host permissions pour domaines IA (ChatGPT, Claude, Perplexity, Kimi)
Configurer TypeScript strict mode
Structure de dossiers selon frontend_rules.mdc section 13.1
1.2 Types et interfaces
Fichier : src/types/*.ts

conversation.ts : Interface Conversation avec tous les champs (canonical_url, source, version, ignore, etc.)
snippet.ts : Interface Snippet
collection.ts : Interface Collection
settings.ts : Interface Settings (storageMode, beast_enabled_per_domain, xpaths_by_domain, etc.)
storage-provider.ts : Interface StorageProvider (méthodes communes IndexedDB/PostgREST)
search-filters.ts : Types pour filtres de recherche
Références : Backend_indexDB.mdc section 1.2, doc/sop_chrome_ext.md section 1.2

Phase 2 : Backend IndexedDB (Mode Local)
2.1 Schéma et initialisation
Fichier : src/lib/storage/indexeddb-schema.ts

Définir schéma IndexedDB (version 1)
Object stores : conversations, snippets, collections, settings, sync_queue
Indexes selon Backend_indexDB.mdc section 1.2
Handler onupgradeneeded pour création des stores et indexes
2.2 Provider IndexedDB
Fichier : src/lib/storage/indexeddb-provider.ts

Implémenter toutes les méthodes de StorageProvider :

getConversationByUrl() : Utiliser index by-url
saveConversation() : Logique create/update avec gestion du flag ignore (préserver lors des updates Beast)
searchConversations() : Charger 1000 dernières, filtrer en mémoire
listSnippets(), saveSnippet(), deleteSnippet()
listCollections(), saveCollection(), deleteCollection()
getSettings(), saveSettings() : Toujours id=1
Logique Beast Mode : Backend_indexDB.mdc section 3.2.2 (incrémenter version, préserver ignore)

2.3 Initialisation des settings par défaut
Fichier : src/lib/storage/indexeddb-utils.ts

Fonction initializeDefaultSettings() : Créer settings par défaut (storageMode='local', domaines Beast activés)
Appeler au premier lancement de l'extension
Références : Backend_indexDB.mdc section 2.2

Phase 3 : Service Worker (Hub Central)
3.1 Service Worker principal
Fichier : src/background/service-worker.ts

Écouter chrome.tabs.onUpdated et chrome.tabs.onActivated
Maintenir état des onglets en mémoire (cache de tabState)
Router messages entre popup et content scripts
3.2 Détection d'URL et normalisation
Fichier : src/background/url-detector.ts

Fonction normalizeUrl() : Nettoyer URL pour obtenir canonical_url (supprimer fragments, paramètres inutiles)
Fonction detectSource() : Déterminer source (chatgpt/claude/perplexity/kimi) depuis domaine
Fonction isBeastEnabled() : Vérifier si Beast Mode activé pour ce domaine (via settings)
3.3 Gestion d'état des onglets
Fichier : src/background/state-manager.ts

Objet TabState : { known: boolean, ignore: boolean, lastUpdated?: string, version?: number, source?: string }
Fonction updateTabState(tabId, canonicalUrl) : 
Vérifier si conversation existe dans storage
Construire état pour popup
Cache en mémoire
3.4 Handler de messages
Dans : src/background/service-worker.ts

Gérer messages depuis popup :

getTabState : Retourner état de l'onglet actif
saveConversation : Sauvegarder conversation manuelle
toggleIgnore : Changer flag ignore d'une conversation
searchConversations : Rechercher conversations
extractConversation : Demander extraction au content script
Références : frontend_rules.mdc section 8.1

Phase 4 : Content Scripts (Extraction)
4.1 Injection de content scripts
Fichier : manifest.json

Déclarer content scripts pour domaines IA configurés
Injection automatique ou via chrome.scripting.executeScript
4.2 Extracteur de contenu
Fichier : src/content-scripts/extractor.ts

Fonction extractConversation() : 
Lire XPath depuis settings (xpaths_by_domain)
Évaluer XPath avec document.evaluate()
Extraire titre, contenu (markdown), description optionnelle
Retourner ConversationPayload
4.3 Utilitaires XPath
Fichier : src/lib/extraction/xpath-utils.ts

Fonction helper pour évaluation XPath sécurisée
Gestion erreurs XPath invalides
Traitement des résultats XPathResult
4.4 Processeur de contenu
Fichier : src/lib/extraction/content-processor.ts

Conversion contenu DOM → markdown
Nettoyage HTML (supprimer scripts, iframes)
Génération description automatique (premiers caractères)
Références : frontend_rules.mdc section 7.2

Phase 5 : Popup UI - Structure de base
5.1 HTML et structure
Fichier : src/popup/popup.html

Structure de base : Header, onglets (Save/Search/Snippets), conteneur principal
Dimensions : 380-420px largeur, max 600px hauteur
Styles de base (système 8px grid)
5.2 Gestion d'onglets
Fichier : src/popup/popup.ts

State pour onglet actif
Navigation entre onglets (pas de reload)
Initialisation : charger état onglet actif via getTabState
5.3 Header
Fichier : src/popup/popup.html + src/popup/popup.ts

Logo + "AI Saver"
Icônes : 🔍 (focus Search), ⚙️ (Settings)
Badge "Local" / "Cloud" (lecture depuis settings)
Références : frontend_rules.mdc section 1.2

Phase 6 : Popup - Onglet Save
6.1 Bandeau Beast Mode
Fichier : src/popup/save-tab.ts

Afficher état Beast Mode (actif/ignoré/non reconnu)
Toggle "Beast pour cette conversation" (change ignore)
États selon frontend_rules.mdc section 2.1
6.2 Résumé de page
Fichier : src/popup/save-tab.ts

Champ titre (éditable, pré-rempli)
URL en read-only
Badge source (ChatGPT/Claude/etc.)
6.3 Formulaire de sauvegarde
Fichier : src/popup/save-tab.ts

Textarea description
Input tags avec chips (autocomplete depuis tags existants)
Dropdown collections + bouton créer collection
Bouton "Sauvegarder maintenant" (force extraction même si Beast OFF)
6.4 Actions
Fichier : src/popup/save-tab.ts

Bouton "Ouvrir mode sélectif" (conditionnel si selective_mode_enabled)
Bouton "Voir conversation complète"
Références : frontend_rules.mdc section 2

Phase 7 : Beast Mode (Collecte automatique)
7.1 Logique Beast dans Service Worker
Fichier : src/background/service-worker.ts

Sur tabs.onUpdated / tabs.onActivated :

Normaliser URL → canonical_url
Détecter source
Vérifier si Beast activé pour ce domaine
Chercher conversation existante par canonical_url
Si existe et ignore=false → déclencher extraction + save (full overwrite)
Si n'existe pas → créer nouvelle conversation
7.2 Full Overwrite Strategy
Fichier : src/background/service-worker.ts

Fonction processBeastMode() :

Appeler extractConversation(tabId) (message vers content script)
Récupérer ConversationPayload
Appeler saveConversation() avec provider actif
Provider gère : incrémenter version, préserver ignore, mettre à jour updated_at
Références : doc/sop_chrome_ext.md section 2.1, Backend_indexDB.mdc section 3.2.2

7.3 Flash Notice (Toast)
Fichier : src/lib/ui/flash-notice.ts

Composant toast affiché sur page web (bottom-right)
Messages selon état (actif/ignoré/non reconnu)
Auto-dismiss après 5 secondes
Injection via content script si Beast détecté
Références : frontend_rules.mdc section 6

Phase 8 : Popup - Onglet Search
8.1 Barre de recherche
Fichier : src/popup/search-tab.ts

Input texte avec debounce 300ms
Bouton clear (X)
8.2 Filtres
Fichier : src/popup/search-tab.ts

Dropdown type : Tous / Conversations / Snippets
Dropdown collections
Bouton filtres avancés (cloud mode seulement)
8.3 Liste de résultats
Fichier : src/popup/search-tab.ts

Affichage résultats : titre, preview, tags, date relative
Actions par item : ↗ (ouvrir URL), 📋 (copier), ⭐ (favori - futur)
Pagination : 20 items à la fois, bouton "Load more"
8.4 Recherche
Fichier : src/popup/search-tab.ts

Appeler searchConversations(query, filters) via message au service worker
Service worker route vers provider actif (IndexedDB pour phase 2)
Références : frontend_rules.mdc section 3

Phase 9 : Popup - Onglet Snippets
9.1 Liste de snippets
Fichier : src/popup/snippets-tab.ts

Affichage similaire à Search (title, language badge, preview, tags, date)
Actions : ouvrir source, copier, éditer, supprimer
9.2 Créer snippet
Fichier : src/popup/snippets-tab.ts

Bouton "+ Nouveau snippet"
Formulaire : title, content (textarea), language, source_url, tags
Sauvegarder via saveSnippet()
Références : frontend_rules.mdc section 4

Phase 10 : Popup - Settings
10.1 Navigation Settings
Fichier : src/popup/settings-tab.ts

Accès via icône ⚙️ dans header
Vue remplace onglet actif, bouton "← Retour"
10.2 Section Stockage
Fichier : src/popup/settings-tab.ts

Radio buttons : Mode Local / Mode Équipe
Si cloud : champs PostgREST URL, Auth Token, bouton "Tester connexion"
Test connexion : GET /conversations?limit=1
10.3 Section Beast Mode
Fichier : src/popup/settings-tab.ts

Toggles par plateforme (ChatGPT, Claude, Perplexity, Kimi)
Option : "Afficher flash notice"
Option : "Ne jamais collecter sur ce domaine"
10.4 Section XPath
Fichier : src/popup/settings-tab.ts

Table : Domaine | XPath Conversation | XPath Message | Test
Bouton "Ajouter domaine"
Bouton "Tester tous XPaths" (dev mode)
10.5 Section Dev Mode
Fichier : src/popup/settings-tab.ts

Toggle "Mode développeur"
Si activé : boutons outils (test XPath, logs, simulateur, vider cache)
Options : logging détaillé, surbrillance éléments
Références : frontend_rules.mdc section 5, doc/sop_local_test.md section I

Phase 11 : Mode Développeur
11.1 Logger développeur
Fichier : src/lib/logger.ts

Classe DevLogger avec logs en mémoire (100 dernières lignes)
Affichage dans devOutput si dev mode activé
Logs timestampés
11.2 Testeur XPath
Fichier : src/content-scripts/selector-injector.ts

Handler message testXPath depuis popup
Évaluer tous XPath configurés
Retourner résultats (nombre éléments trouvés, durée, erreurs)
11.3 Surbrillance éléments
Fichier : src/content-scripts/selector-injector.ts

Fonction highlightElements() : overlay vert sur éléments extraits (3s)
Afficher uniquement si devModeEnabled et verboseLogging
11.4 Indicateur debug
Fichier : src/content-scripts/selector-injector.ts

Icône 🔧 fixed top-right si dev mode
Clic → ouvrir outils debug
11.5 Simulateur extraction
Fichier : src/popup/settings-tab.ts

Bouton "Simuler extraction" : génère données mockées
Stocke dans chrome.storage.local pour test popup
Références : doc/sop_local_test.md sections II, IV.3

Phase 12 : Backend PostgREST (Mode Cloud) - Optionnel

12.1 Configuration Docker (PostgreSQL + PostgREST)
Fichier : docker-compose.yml

Services à créer :
- PostgreSQL 15+ (port 5432)
- PostgREST (port 3000)
- pgAdmin (optionnel, port 5050)

Configuration docker-compose.yml :
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ai_saver
      POSTGRES_PASSWORD: ai_saver_dev
      POSTGRES_DB: ai_saver_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ai_saver"]
      interval: 10s
      timeout: 5s
      retries: 5

  postgrest:
    image: postgrest/postgrest:latest
    ports:
      - "3000:3000"
    environment:
      PGRST_DB_URI: postgres://ai_saver:ai_saver_dev@postgres:5432/ai_saver_db
      PGRST_DB_SCHEMA: api
      PGRST_DB_ANON_ROLE: web_anon
      PGRST_DB_SCHEMAS: api
      PGRST_JWT_SECRET: your-super-secret-jwt-token-change-in-production
      PGRST_DB_EXTRA_SEARCH_PATH: api
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  pgadmin:
    image: dpage/pgadmin4:latest
    ports:
      - "5050:80"
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@ai-saver.local
      PGADMIN_DEFAULT_PASSWORD: admin
    depends_on:
      - postgres
    profiles:
      - tools

volumes:
  postgres_data:
```

Fichier : docker/init.sql

Script SQL pour créer schéma initial :
- Créer schema `api`
- Créer rôle `web_anon` (read-only) et `authenticated` (full CRUD)
- Créer tables : conversations, snippets, collections, teams
- Créer indexes (GIN sur tags, B-tree sur updated_at, etc.)
- Activer RLS sur toutes les tables
- Créer policies RLS pour isolation par team_id
- Créer fonction search_conversations pour full-text search (optionnel)

Références : Backend_Postgresql.mdc sections 1-2

12.2 Scripts SQL de migration
Fichier : docker/schema.sql

Définir schéma complet selon Backend_Postgresql.mdc section 1.2 :
- Tables avec colonnes exactes
- Contraintes UNIQUE (canonical_url + team_id)
- Indexes (GIN pour tags, B-tree pour sorting)
- Fonctions SQL pour recherche avancée

Fichier : docker/README.md

Instructions :
- docker-compose up -d : Démarrer services
- docker-compose logs -f postgrest : Voir logs PostgREST
- docker-compose down -v : Arrêter et supprimer volumes (reset DB)
- Accès PostgREST : http://localhost:3000
- Accès pgAdmin : http://localhost:5050 (si activé)

12.3 Provider PostgREST
Fichier : src/lib/storage/postgrest-provider.ts

Implémenter interface StorageProvider
- Méthode request() avec gestion auth (JWT/API key)
- getConversationByUrl() : GET /conversations?canonical_url=eq.{url}&team_id=eq.{teamId}
- saveConversation() : POST (create) ou PATCH (update)
- searchConversations() : Utiliser filtres PostgREST (ilike, cs.{tags})
- URL par défaut : http://localhost:3000 (configurable dans settings)

12.4 Mapping données
Fichier : src/lib/storage/postgrest-utils.ts

- mapFromDB() : Convertir dates ISO → Date objects
- mapToDB() : Convertir Date → ISO strings
- Gestion arrays tags (TEXT[] PostgreSQL)
- Gestion team_id depuis JWT ou settings

12.5 Configuration Settings (Cloud Mode)
Fichier : src/popup/settings-tab.ts

Dans section Stockage (Phase 10.2) :
- URL par défaut : http://localhost:3000 (pre-rempli)
- Champ Auth Token : JWT ou API key
- Bouton "Tester connexion" : GET http://localhost:3000/conversations?limit=1
- Message si Docker non démarré : "Impossible de se connecter. Vérifiez que Docker est démarré."

12.6 Sync Queue (IndexedDB)
Fichier : src/lib/storage/indexeddb-sync.ts

- Quand storageMode='cloud' : écrire dans IndexedDB + ajouter à sync_queue
- Processeur de queue : sync background vers PostgREST (http://localhost:3000)
- Retry logic (max 3 tentatives)
- Gestion erreurs réseau (Docker arrêté, PostgREST non accessible)

12.7 Authentification simplifiée (Docker local)
Pour développement local :
- Option 1 : Pas d'authentification (anonyme = full access en dev)
- Option 2 : API Key simple dans header Authorization: Bearer <key>
- Option 3 : JWT avec team_id hardcodé pour tests

Pour production : Implémenter JWT complet avec gestion d'équipes

Références : Backend_Postgresql.mdc sections 3, 4, 8

Phase 13 : Optimisations et polish
13.1 Gestion erreurs
Messages utilisateur-friendly (pas de détails techniques)
Fallbacks si IndexedDB échoue
Gestion réseau pour cloud mode
13.2 Performance
Lazy loading popup (charger onglet actif seulement)
Debounce recherche 300ms
Limiter résultats IndexedDB (pagination)
13.3 Accessibilité
ARIA labels
Navigation clavier
Focus indicators
13.4 Tests manuels
Checklist selon frontend_rules.mdc section 14.1

Ordre d'implémentation recommandé
Sprint 1 : Phases 1-2 (Infrastructure + IndexedDB)

Sprint 2 : Phases 3-4 (Service Worker + Content Scripts)

Sprint 3 : Phases 5-6 (Popup base + Onglet Save)

Sprint 4 : Phase 7 (Beast Mode)

Sprint 5 : Phases 8-9 (Onglets Search + Snippets)

Sprint 6 : Phase 10 (Settings)

Sprint 7 : Phase 11 (Dev Mode)

Sprint 8 : Phase 12 (PostgREST - optionnel)

Sprint 9 : Phase 13 (Polish)

Fichiers clés à créer
```

src/
  types/
    conversation.ts
    snippet.ts
    collection.ts
    settings.ts
    storage-provider.ts
    search-filters.ts
  lib/
    storage/
      indexeddb-provider.ts
      indexeddb-schema.ts
      indexeddb-utils.ts
      storage-provider.ts
      postgrest-provider.ts (phase 12)
      postgrest-utils.ts (phase 12)
      indexeddb-sync.ts (phase 12)
    extraction/
      xpath-utils.ts
      content-processor.ts
    ui/
      flash-notice.ts
      toast.ts
    logger.ts
  background/
    service-worker.ts
    url-detector.ts
    state-manager.ts
  content-scripts/
    extractor.ts
    selector-injector.ts
  popup/
    popup.html
    popup.ts
    save-tab.ts
    search-tab.ts
    snippets-tab.ts
    settings-tab.ts

docker/ (phase 12)
  docker-compose.yml
  init.sql (initialisation DB + schéma)
  schema.sql (définition complète du schéma)
  README.md (instructions Docker)

Configuration root:
  manifest.json
  package.json
  tsconfig.json
  vite.config.ts
  .gitignore