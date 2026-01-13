# Guide d'utilisation - AI Saver Extension Chrome

Bienvenue dans **AI Saver**, l'extension Chrome qui sauvegarde et organise automatiquement vos conversations avec les plateformes d'intelligence artificielle.

---

## 📦 Installation

### Prérequis
- Google Chrome ou Chromium (version récente)
- Node.js 18+ (pour le développement uniquement)

### Installation de l'extension

1. **Construire l'extension** (si vous développez) :
   ```bash
   npm install
   npm run build
   ```

2. **Charger l'extension dans Chrome** :
   - Ouvrez Chrome et allez à `chrome://extensions/`
   - Activez le **"Mode développeur"** (toggle en haut à droite)
   - Cliquez sur **"Charger l'extension non empaquetée"**
   - Sélectionnez le dossier `dist/` du projet

3. **Vérifier l'installation** :
   - L'icône AI Saver devrait apparaître dans la barre d'outils Chrome
   - Cliquez sur l'icône pour ouvrir le popup

---

## 🚀 Première utilisation

### Configuration initiale

Lors du premier lancement, l'extension est configurée en **Mode Local** par défaut. Vos données sont stockées localement dans votre navigateur (IndexedDB) et fonctionnent hors ligne.

### Accéder aux paramètres

1. Cliquez sur l'icône de l'extension
2. Cliquez sur l'icône ⚙️ dans le header (en haut à droite)
3. Configurez vos préférences (voir section [Paramètres](#-paramètres))

---

## 🤖 Beast Mode - Collecte automatique

Le **Beast Mode** est la fonctionnalité principale de l'extension : il sauvegarde automatiquement vos conversations sur les plateformes IA configurées.

### Comment ça fonctionne

1. **Activation automatique** : Le Beast Mode est activé par défaut pour les plateformes suivantes :
   - ChatGPT (chat.openai.com)
   - Claude (claude.ai)
   - Perplexity (www.perplexity.ai)
   - Mistral (chat.mistral.ai)
   - DeepSeek (chat.deepseek.com)
   - Qwen (chat.qwen.ai)
   - Manus (manus.im)
   - Grok (grok.com)

2. **Détection automatique** : Quand vous visitez une conversation sur une plateforme IA :
   - L'extension détecte automatiquement l'URL
   - Extrait le contenu de la conversation
   - Sauvegarde dans votre base de données locale

3. **Notifications visuelles** : 
   - Une **flash notice** (toast) apparaît en bas à droite de la page pour confirmer la sauvegarde
   - Exemple : "✅ Conversation sauvegardée (v3) – ChatGPT"

### Contrôle par conversation

Pour chaque conversation, vous pouvez désactiver temporairement le Beast Mode :

1. Ouvrez l'extension sur la page de la conversation
2. Dans l'onglet **Save**, le bandeau d'état affiche :
   - ✅ **"URL reconnue. Beast Mode actif"** si la collecte est active
   - ⏸️ **"Beast désactivé pour cette URL"** si la collecte est désactivée

> **Note** : Quand vous désactivez le Beast Mode pour une conversation, l'extension n'écrasera plus cette conversation lors des mises à jour automatiques. Vous pouvez toujours la sauvegarder manuellement.

### Mise à jour automatique

- Si vous modifiez une conversation existante, l'extension **écrase** automatiquement l'ancienne version
- Le numéro de version est incrémenté à chaque mise à jour
- Les tags et la description que vous avez ajoutés manuellement sont préservés

---

## 💾 Sauvegarde manuelle

Même si le Beast Mode est désactivé, vous pouvez sauvegarder manuellement n'importe quelle conversation.

### Étapes

1. **Ouvrez l'extension** sur la page de la conversation
2. L'onglet **Save** s'affiche par défaut
3. **Remplissez le formulaire** :
   - **Titre** : Modifiez si nécessaire (pré-rempli automatiquement)
   - **Description** : Ajoutez un résumé (optionnel)
   - **Tags** : Séparez les tags par des virgules (ex: `client, projet, idee`)
4. Cliquez sur **"Sauvegarder maintenant"**

### Rafraîchir l'extraction

Si le contenu de la page a changé, cliquez sur le bouton **⟳** à côté de "Sauvegarder maintenant" pour ré-extraire le contenu.

---

## 🔍 Recherche et navigation

L'onglet **Search** vous permet de retrouver rapidement vos conversations sauvegardées.

### Barre de recherche

- Tapez dans le champ de recherche pour filtrer par titre, description ou contenu
- La recherche est **instantanée** (déclenchée après 300ms de pause)

### Filtres par tags

Dans la **sidebar gauche** :
- Les tags les plus utilisés sont affichés automatiquement
- Cochez un ou plusieurs tags pour filtrer les résultats
- Décochez pour afficher toutes les conversations

### Résultats de recherche

Chaque résultat affiche :
- **Titre** de la conversation
- **Aperçu** (description ou extrait du contenu)
- **Tags** (chips colorés)
- **Date relative** (ex: "il y a 2 jours")

### Actions sur une conversation

Pour chaque résultat, vous disposez de plusieurs actions :

- **👁 Prévisualiser** : Affiche la conversation complète dans une modale
- **✏️ Éditer** : Modifie le titre, la description et les tags
- **↗ Ouvrir** : Ouvre l'URL originale dans un nouvel onglet
- **🗑 Supprimer** : Supprime la conversation (avec confirmation)

---

## 📝 Gestion des snippets

Les **snippets** sont des extraits de code ou de texte que vous souhaitez conserver séparément.

### Créer un snippet

1. Allez dans l'onglet **Snippets**
2. Cliquez sur **"+ Nouveau snippet"**
3. Remplissez le formulaire :
   - **Titre** * (requis)
   - **Contenu** * (requis) - Zone de texte monospace pour le code
   - **Langage** : Sélectionnez le langage de programmation (optionnel)
   - **URL source** : Lien vers la source originale (optionnel)
   - **Tags** : Séparez par des virgules (optionnel)
4. Cliquez sur **"Enregistrer"**

### Filtrer les snippets

Dans la sidebar gauche :
- **Filtre par langage** : Dropdown pour sélectionner un langage spécifique
- **Filtres par tags** : Cochez les tags pour affiner la recherche

### Actions sur un snippet

- **📋 Copier** : Copie le contenu dans le presse-papier
- **↗ Ouvrir source** : Ouvre l'URL source dans un nouvel onglet
- **✏️ Éditer** : Modifie le snippet
- **🗑 Supprimer** : Supprime le snippet (avec confirmation)

---

## ⚙️ Paramètres

Accédez aux paramètres en cliquant sur l'icône ⚙️ dans le header de l'extension.

### Stockage

#### Mode Local (par défaut)
- Stockage dans **IndexedDB** (base de données locale du navigateur)
- Fonctionne **hors ligne**
- Données stockées uniquement sur votre ordinateur
- Aucune configuration requise

#### Mode Équipe (Cloud)
- Stockage dans **PostgreSQL** via **PostgREST**
- Permet le partage et la synchronisation entre plusieurs utilisateurs
- Configuration requise :
  - **PostgREST URL** : URL de votre serveur PostgREST (ex: `http://localhost:3000`)
  - **Auth token** : Token d'authentification (JWT ou API key)
  - Cliquez sur **"Tester la connexion"** pour vérifier

> **Note** : Le mode Cloud nécessite un serveur PostgreSQL + PostgREST configuré. Consultez la documentation technique pour plus d'informations.

### Beast Mode

Activez ou désactivez le Beast Mode pour chaque plateforme IA :

- ✅ **ChatGPT** (chat.openai.com)
- ✅ **Claude** (claude.ai)
- ✅ **Perplexity** (www.perplexity.ai)
- ✅ **Kimi** (kimi.moonshot.cn)
- ✅ **Mistral** (chat.mistral.ai)
- ✅ **DeepSeek** (chat.deepseek.com)
- ✅ **Qwen** (chat.qwen.ai)
- ✅ **Manus** (manus.im)
- ✅ **Grok** (grok.com)

Décochez une plateforme pour désactiver la collecte automatique sur ce domaine.

### Mode développeur

Activez le **Mode développeur** pour accéder à des outils de débogage avancés (réservé aux développeurs).

---

## 🎯 Cas d'usage courants

### Sauvegarder une conversation importante

1. Ouvrez la conversation sur ChatGPT/Claude/etc.
2. Ouvrez l'extension
3. Ajoutez des tags pertinents (ex: `important, client-xyz`)
4. Cliquez sur "Sauvegarder maintenant"

### Retrouver une conversation

1. Ouvrez l'onglet **Search**
2. Tapez des mots-clés dans la barre de recherche
3. Ou filtrez par tags dans la sidebar
4. Cliquez sur 👁 pour prévisualiser ou ↗ pour ouvrir

### Organiser vos conversations

Utilisez les **tags** pour organiser vos conversations :
- Par projet : `projet-alpha`, `projet-beta`
- Par client : `client-xyz`, `client-abc`
- Par type : `code`, `design`, `marketing`
- Par urgence : `urgent`, `important`

### Sauvegarder un extrait de code

1. Allez dans l'onglet **Snippets**
2. Cliquez sur "+ Nouveau snippet"
3. Collez votre code
4. Sélectionnez le langage
5. Ajoutez des tags pour le retrouver facilement

---

## ❓ Questions fréquentes (FAQ)

### Le Beast Mode ne fonctionne pas sur une plateforme

**Vérifications** :
1. Allez dans **Paramètres** → **Beast Mode**
2. Vérifiez que la plateforme est cochée
3. Rechargez la page de la conversation
4. Vérifiez que l'URL correspond bien au domaine configuré

### Je ne vois pas mes conversations sauvegardées

1. Vérifiez que vous êtes dans l'onglet **Search**
2. Effacez les filtres (tags, recherche)
3. Vérifiez le mode de stockage (Local/Cloud) dans le header

### Comment exporter mes données ?

Actuellement, les données sont stockées localement dans IndexedDB. Pour exporter :
1. Utilisez les DevTools Chrome (`F12`)
2. Allez dans l'onglet **Application** → **IndexedDB**
3. Exportez manuellement les données

> **Note** : Une fonctionnalité d'export/import sera ajoutée dans une future version.

### Puis-je synchroniser mes données entre plusieurs ordinateurs ?

Oui, en utilisant le **Mode Équipe (Cloud)** :
1. Configurez un serveur PostgreSQL + PostgREST
2. Activez le mode Cloud dans les paramètres
3. Entrez l'URL et le token d'authentification
4. Vos données seront synchronisées via le serveur

### Les flash notices sont trop intrusives

Les flash notices apparaissent automatiquement après chaque sauvegarde Beast Mode. Elles disparaissent automatiquement après 4 secondes. Cette fonctionnalité ne peut pas être désactivée actuellement.

### Comment supprimer toutes mes données ?

1. Allez dans **Paramètres**
2. Activez le **Mode développeur**
3. Utilisez l'outil "Vider cache IndexedDB" (si disponible)

> **Attention** : Cette action est irréversible. Assurez-vous d'avoir une sauvegarde si nécessaire.

---

## 🐛 Dépannage

### L'extension ne se charge pas

1. Vérifiez que l'extension est bien chargée dans `chrome://extensions/`
2. Rechargez l'extension (bouton ⟳)
3. Vérifiez les erreurs dans la console (clic droit sur l'icône → "Inspecter le popup")

### La sauvegarde échoue

1. Vérifiez les permissions de l'extension dans `chrome://extensions/`
2. Vérifiez que le mode de stockage est correctement configuré
3. Consultez la console du service worker pour les erreurs

### Le contenu extrait est incomplet

1. Vérifiez que la page est complètement chargée
2. Cliquez sur le bouton ⟳ pour ré-extraire le contenu
3. Certaines plateformes peuvent nécessiter des XPath personnalisés (mode développeur)

---

## 📚 Ressources supplémentaires

- **Code source** : Voir le repository GitHub
- **Issues** : Signalez les bugs sur GitHub Issues
- **Documentation technique** : Consultez les fichiers dans `doc/` (pour développeurs)

---

## 🔄 Mises à jour

L'extension est en développement actif. Les nouvelles fonctionnalités seront documentées dans les notes de version.

**Dernière mise à jour** : Voir le fichier `CHANGELOG.md` (si disponible)

---

## 📧 Support

Pour toute question ou problème :
1. Consultez d'abord cette documentation
2. Vérifiez les issues existantes sur GitHub
3. Créez une nouvelle issue si nécessaire

---

**Bonne utilisation de AI Saver ! 🚀**
