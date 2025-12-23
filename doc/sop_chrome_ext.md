La logique la plus efficace est bien : **Beast Mode = full overwrite paresseux + contrôle simple**, avec IndexedDB en local par défaut et PostgreSQL+PostgREST en option “cloud équipe”. Voici un SOP complet à jour.

---

## 1. Modes de stockage et backend

### 1.1 Modes possibles

- **Mode Local (par défaut)**  
  - Stockage dans **IndexedDB** uniquement.  
  - Aucune dépendance serveur, usage autonome hors ligne.[1][2]

- **Mode Équipe (Cloud)**  
  - Stockage principal dans **PostgreSQL** exposé via **PostgREST** (REST auto-généré).[3][4][5]
  - IndexedDB utilisé comme **cache local + queue de synchronisation**.

Un flag dans les settings contrôle le mode :
- `storageMode = "local" | "cloud"`  
- Si `cloud` activé, les appels CRUD passent par PostgREST, sinon par IndexedDB.

### 1.2 Modèles de données (schema commun)

#### Conversations
Champs logiques (communs IndexedDB & Postgres) :
- `id` : identifiant interne
- `canonical_url` : URL normalisée de la conversation (clé de déduplication)
- `share_url` : URL de partage (si dispo)
- `source` : `chatgpt | claude | perplexity | kimi | other`
- `title` : titre (généré ou repris de la page)
- `description` : résumé court
- `content` : texte complet (markdown brut)
- `tags` : liste de tags
- `collection_id` : lien logique vers une collection
- `ignore` : booléen, si vrai Beast Mode ne collecte plus pour cette URL
- `version` : entier, incrémenté à chaque overwrite Beast
- `created_at`, `updated_at`

PostgreSQL (dans un schema `api` pour PostgREST) par exemple :[6][7]
- Table `api.conversations` avec index:
  - `UNIQUE(canonical_url, team_id)` pour déduplication
  - GIN sur `tags`
  - B-tree sur `updated_at`

IndexedDB :
- Object store `conversations` avec index sur :
  - `"by-url"` (canonical_url)
  - `"by-updated"` (updated_at)
  - `"by-tags"` (tags, multiEntry)

#### Snippets
- `id`
- `title`
- `content`
- `source_url`
- `source_conversation_id`
- `tags`
- `language`
- `created_at`

#### Collections
- `id`
- `name`
- `icon`
- `color`
- `created_at`

#### Settings
- `storageMode` (`local`/`cloud`)
- `postgrest_url`
- `postgrest_auth` (token/JWT si tu en mets un)
- `beast_enabled_per_domain`
- `selective_mode_enabled`
- `devModeEnabled`
- XPaths par domaine

***

## 2. Logique Beast Mode + Lazy Control

### 2.1 Règle générale Beast Mode

Sur un domaine IA activé pour Beast (ex. ChatGPT) :

1. L’extension détecte l’URL de la page.  
2. Calcule une **`canonical_url`** (nettoyage paramètres inutiles).  
3. Vérifie dans la DB (IndexedDB ou Postgres) :
   - Si aucune entrée pour `canonical_url` → **création**.  
   - Si entrée existe et `ignore = false` → **mise à jour** (full overwrite).  

4. **Full overwrite (Option A)** :
   - Ré-extraction du contenu complet (via XPath / sélecteurs).
   - Écrase `content`, met à jour `description`, `tags` éventuels.
   - Incrémente `version`, met à jour `updated_at`.

5. Si `ignore = true` → ne rien collecter.

### 2.2 Lazy control par URL

- Pour chaque conversation, champ booléen `ignore`.  
- Dans le popup, pour une page ouverte, l’extension affiche une **flash notice** + un toggle :

#### Flash notice (overlay / toast minimal)
- **Si URL détectée & suivie** :  
  - Bannière courte en bas ou toast :  
  - “Conversation détectée (ChatGPT) – Beast Mode actif. Dernière sauvegarde : HH:MM. [Pause collecte]”
- **Si URL détectée mais ignorée** :  
  - “Conversation ignorée. Beast Mode désactivé pour cette URL. [Reprendre collecte]”
- **Si URL non reconnue** :  
  - “URL non supportée par Beast Mode (source inconnue).”

(La flash notice doit être brève, disparaître seule après quelques secondes.)

#### Comportement du toggle
Dans le popup (voir UI section 3) :
- Switch “Collecte auto (Beast) pour cette conversation” :
  - ON → `ignore = false`, Beast continue à overwriter.
  - OFF → `ignore = true`, plus de collecte automatique.

---

## 3. Interface de l’extension (popup & overlay)

### 3.1 Structure globale du popup

Popup (≈ 380–420px de large, max 600px de haut)  :[8][9][10]

- **Header (barre supérieure)**  
  - À gauche : logo/nom (“AI Saver”).  
  - À droite :  
    - Icône loupe = **Search view**.  
    - Icône rouage = **Settings view**.  
    - Petit pill “Local” / “Cloud” (mode de stockage courant).

- **Corps** : 3 onglets (barre d’onglets juste sous le header) :  
  - Onglet 1 : **“Save”** (écran de sauvegarde rapide de la page actuelle).  
  - Onglet 2 : **“Search”** (liste + recherche).  
  - Onglet 3 : **“Snippets”**.

Les onglets peuvent être routés par state interne, l’icône loupe peut simplement focus l’onglet Search.

### 3.2 Onglet “Save” (clic sur l’icône de l’extension)

Contenu :

1. **Bandeau d’état Beast / URL** (en haut du panneau Save)  
   - Affiche la flash info courte :
     - “URL reconnue (ChatGPT). Beast Mode actif. Version n.”  
     - ou “Beast désactivé pour cette URL.”  
     - ou “URL non reconnue / domaine non configuré.”
   - À droite : mini switch “Beast pour cette conversation” (change `ignore`).

2. **Résumé de la page actuelle**  
   - Titre (éditable)  
   - URL (read-only)  
   - Source (icône ChatGPT/Claude/Perplexity/Kimi)

3. **Formulaire de sauvegarde manuelle**  
   - Description (textarea)  
   - Tags (chips, auto-complétion)  
   - Collection (dropdown + “+” pour créer une collection)

4. **Boutons principaux**  
   - “Sauvegarder maintenant” (force une extraction et un write même si Beast est OFF)  
   - “Ouvrir mode sélectif” (si `selective_mode_enabled` dans settings)  
   - “Voir conversation complète” (ouvre la vue détaillée dans Search ou dans une modale)

### 3.3 Onglet “Search”

1. **Barre de recherche en haut**  
   - Input texte (plein écran)  
   - Filtres :  
     - Type : Tous / Conversations / Snippets  
     - Collection (dropdown)  
     - (si mode cloud) Facettes (tags, auteur, période) dans un bouton “Filtres”

2. **Liste de résultats**  
   - Chaque ligne :
     - Titre  
     - Lignes de preview de `description` ou extrait du content  
     - Tags (chips)  
     - Date (relative : “il y a 2 jours”)  
   - Actions par résultat :
     - Icône **flèche** ↗ : ouvrir `url` dans un nouvel onglet.  
     - Icône **copie** 📋 : copier le bloc (content ou snippet) dans le presse-papier.  
     - Icône **étoile** / options : plus tard (fav, etc.).

3. **Sources de données selon mode**  
   - Mode Local : requêtes sur IndexedDB.[11][2]
   - Mode Cloud :  
     - Recherche simple : `GET /conversations?title=ilike.*mot*&team_id=eq.xyz` via PostgREST.[4][3]
     - Facettes : vues SQL exposées via PostgREST.

### 3.4 Onglet “Snippets”

- Liste des snippets récents.  
- Filtres par langage et tags.  
- Bouton “Nouveau snippet” (ouvre un petit formulaire dans le popup).  
- Actions : ouvrir source, copier snippet, éditer, supprimer.

### 3.5 Page Settings (vue séparée dans le popup)

Sections :

1. **Stockage**  
   - Radio :  
     - “Mode Local (IndexedDB)”  
     - “Mode Équipe (PostgreSQL + PostgREST)”  
   - Si cloud sélectionné :  
     - Champ `PostgREST URL` (ex. `http://localhost:3000`)  
     - Champ `Auth token`  
     - Bouton “Tester la connexion” → `GET /` ou `GET /conversations?limit=1`  
     - Statut : OK / erreur affiché.

2. **Beast Mode**  
   - Toggle général : Beast Mode activé sur :  
     - ChatGPT  
     - Claude  
     - Perplexity  
     - Kimi  
   - Options :  
     - “Afficher flash notice quand une conversation est détectée”  
     - “Ne jamais collecter automatiquement sur ce domaine” (whitelist/blacklist)

3. **Mode sélectif**  
   - Checkbox : “Activer mode sélectif façon Kimi”  
   - Rappel : en mode sélectif, seules les sélections (checkbox rondes) créent des snippets/conversations spécifiques.

4. **XPaths / Sélecteurs**  
   - Table par domaine :  
     - Domaine | XPath conversation | XPath message | Test (bouton)  
   - Bouton “Tester tous les XPaths sur la page active” (mode dev).

5. **Dev Mode**  
   - Toggle “Mode développeur”  
   - Affichage des outils : logs, test XPath, simulateur d’extraction.

***

## 4. Logique front : fonctions principales

### 4.1 Détection & flash notice

Dans le service worker :

- Sur `tabs.onUpdated` ou `tabs.onActivated` :
  1. Récupérer l’URL et la normaliser → `canonical_url`.  
  2. Déterminer `source` (chatgpt/claude/etc.) en fonction du domaine.  
  3. Interroger IndexedDB/Postgres pour voir si `canonical_url` existe.  
  4. Construire un petit objet d’état pour le popup :
     - `known: boolean`  
     - `ignore: boolean`  
     - `lastUpdated`  
     - `version`

Le popup, en s’ouvrant, lit cet état via `chrome.runtime.sendMessage` et affiche la flash notice + état du toggle Beast.

### 4.2 Sauvegarde Beast (full overwrite)

Fonction générique côté service-worker :

- `extractConversation(tabId)` :  
  - Envoie un message au content-script pour extraire :
    - Titre  
    - Contenu complet  
    - Résumé (facultatif)  
  - Renvoie un objet `ConversationPayload`.

- `saveConversation(payload)` :  
  - Récupère le storage provider (IndexedDB ou PostgREST via `storageMode`).  
  - Cherche une conversation par `canonical_url`.  
  - Si non trouvée → create.  
  - Si trouvée et `ignore=false` → overwrite (`content`, `description`, `tags`) + `version++`.

***

## 5. Backend : IndexedDB & PostgREST en détail

### 5.1 IndexedDB (mode local & cache)

Object stores :
- `conversations`
- `snippets`
- `collections`
- `settings`
- éventuellement `sync_queue` si mode cloud.

Fonctions fournies par un provider `IndexedDBProvider` :

- `getConversationByUrl(canonicalUrl)`  
- `saveConversation(conversation)` (create/update selon présence de `id`)  
- `searchConversations(query)` (filtrage simple titre+tags+fulltext basique)  
- `listSnippets(filters)`  
- `saveSnippet(snippet)`  
- `getSettings()` / `saveSettings()`  

### 5.2 PostgREST (mode cloud)

PostgREST expose directement la base via REST en lisant le schéma SQL.[5][3][4]

Endpoints typiques :

- `POST /conversations`  
  - Body JSON = conversation  
  - Crée en base, renvoie ligne.

- `GET /conversations?canonical_url=eq.<url>&team_id=eq.<team>`  
  - Vérifie existence pour Beast.

- `PATCH /conversations?id=eq.<id>`  
  - Overwrite lors de Beast update.

- `GET /conversations?title=ilike.*mot*&team_id=eq.<team>&limit=20`  
  - Recherche simple.

- `GET /rpc/search_conversations` (si tu crées une fonction SQL custom pour la recherche full-text/facettes).

Provider `PostgRESTProvider` implémente :

- `getConversationByUrl(canonicalUrl)` → GET avec `canonical_url=eq.`  
- `saveConversation(conversation)` →  
  - s’il y a un `id` : PATCH  
  - sinon POST  
- `searchConversations(query)` → GET avec paramètres `ilike`, `tags=cs.{...}` etc.  
- `listSnippets`, `saveSnippet` pareil.

***

## 6. Recherches et affichage dans le popup

### 6.1 Recherche côté IndexedDB

Approche simple :
- Charger les conversations récentes + filtrer en mémoire pour une première version (tu optimises plus tard si nécessaire).[11]

Optimisation :
- Index sur `title`, `tags`, `updated_at`.  
- Utiliser un `IDBKeyRange` sur `updated_at` pour pagination.

### 6.2 Recherche côté PostgREST

- Utiliser les opérateurs de filtrage PostgREST :[3][4]
  - `?title=ilike.*mot*`  
  - `&tags=cs.{tag1,tag2}`  
  - `&order=updated_at.desc&limit=20`  

- Pour les facettes, exposer une vue ou une fonction SQL renvoyant un JSON de facettes (tags, périodes, etc.) et l’appeler via `/rpc/get_facets`.

***

## 7. Résumé des choix clés

- **Beast Mode** :  
  - Full overwrite par défaut (simple, robuste).  
  - Contrôlé par champ `ignore` + toggle dans l’UI.  
  - Flash notice informe si URL détectée / connue / ignorée.

- **Modes de stockage** :  
  - IndexedDB par défaut (local-first).  
  - Option Postgres+PostgREST pour collaboration d’équipe, recherche avancée, facettes.

- **UI** :  
  - Popup avec 3 onglets (Save, Search, Snippets).  
  - Header avec Search, Settings, indicateur Local/Cloud.  
  - Beast et sélectif pilotés via Settings + toggle contextuel par conversation.

- **Backend** :  
  - Modèles communs pour conversations/snippets/collections.  
  - Providers séparés pour IndexedDB et PostgREST, interchangeable via `storageMode`.

Avec cette architecture, tu as un **mode paresseux mais fiable** pour la collecte, une UX claire, et un backend extensible pour passer du solo à l’équipe sans tout refaire.
